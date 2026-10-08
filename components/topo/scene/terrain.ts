import {
  BufferAttribute,
  BufferGeometry,
  DataTexture,
  LinearFilter,
  LinearMipmapLinearFilter,
  Matrix4,
  RepeatWrapping,
  RGBAFormat,
  ShaderMaterial,
  Vector2,
  Vector3,
  Vector4,
} from 'three'
import { COLORS, skyFragment, skyVertex, srgb, terrainFragment, terrainVertex } from './shaders'
import { RELIEF, SUN, axisCoords, gridSampler, mottleAt, occlusionAt, shadowAt, worldY } from './surface'

const v3 = (hex: string) => new Vector3(...srgb(hex))

/**
 * A 256² tiling noise texture (r: fine grain, g: clumps), so the fragment shader samples
 * land texture instead of hashing it: cheaper, and mipmapped, so it never shimmers or blocks.
 */
function noiseTexture() {
  const S = 256
  const data = new Uint8Array(S * S * 4)
  const lattice = (period: number, seed: number) => {
    const g = new Float32Array(period * period)
    let a = seed
    for (let i = 0; i < g.length; i++) {
      a = (Math.imul(a ^ (a >>> 15), 2246822519) + 0x9e3779b9) | 0
      g[i] = ((a >>> 0) % 10007) / 10007
    }
    return (x: number, y: number) => {
      const xi = Math.floor(x)
      const yi = Math.floor(y)
      const u = x - xi
      const v = y - yi
      const su = u * u * (3 - 2 * u)
      const sv = v * v * (3 - 2 * v)
      const at = (i: number, j: number) => g[(((j % period) + period) % period) * period + (((i % period) + period) % period)]
      const a0 = at(xi, yi)
      const b0 = at(xi + 1, yi)
      const c0 = at(xi, yi + 1)
      const d0 = at(xi + 1, yi + 1)
      return a0 + (b0 - a0) * su + (c0 - a0) * sv + (a0 - b0 - c0 + d0) * su * sv
    }
  }
  const octaves = (base: number, seed: number) => {
    const ls = [0, 1, 2, 3].map((o) => lattice(base << o, seed + o * 101))
    return (u: number, v: number) => {
      let s = 0
      let amp = 0.5
      for (let o = 0; o < 4; o++) {
        const p = base << o
        s += amp * ls[o](u * p, v * p)
        amp *= 0.5
      }
      return s / 0.9375
    }
  }
  const grain = octaves(8, 11)
  const clumps = octaves(16, 47)
  for (let j = 0; j < S; j++)
    for (let i = 0; i < S; i++) {
      const o = (j * S + i) * 4
      data[o] = Math.round(grain(i / S, j / S) * 255)
      data[o + 1] = Math.round(clumps(i / S, j / S) * 255)
      data[o + 2] = 0
      data[o + 3] = 255
    }
  const tex = new DataTexture(data, S, S, RGBAFormat)
  tex.wrapS = tex.wrapT = RepeatWrapping
  tex.magFilter = LinearFilter
  tex.minFilter = LinearMipmapLinearFilter
  tex.generateMipmaps = true
  tex.anisotropy = 4
  tex.needsUpdate = true
  return tex
}

/** Shared by the sky and the land: the sky's frame (ray, sun) and the sunrise glow behind the summit. */
export function createBackdrop() {
  return {
    uBg: { value: new Vector4(0, 0, 1, 0) },
    uRes: { value: new Vector2(1, 1) },
    uInvViewProj: { value: new Matrix4() },
    uSun: { value: new Vector3(...SUN) },
    uNight: { value: 0 },
  }
}

/** A full-screen triangle drawn first, behind everything: the backdrop. */
export function createSky(backdrop: ReturnType<typeof createBackdrop>) {
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3))
  const material = new ShaderMaterial({
    vertexShader: skyVertex,
    fragmentShader: skyFragment,
    uniforms: { ...backdrop, uTime: { value: 0 } },
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  })
  return { geometry, material }
}

/** One material for every terrain build: biomes, baked light, contours, camp glow, mist, fog. */
export function createTerrainMaterial(backdrop: ReturnType<typeof createBackdrop>) {
  return new ShaderMaterial({
    vertexShader: terrainVertex,
    fragmentShader: terrainFragment,
    uniforms: {
      uH: { value: RELIEF },
      uTime: { value: 0 },
      ...backdrop,
      uInk: { value: v3(COLORS.ink) },
      uIce: { value: v3(COLORS.ice) },
      uGlow: { value: v3(COLORS.glow) },
      uCore: { value: v3(COLORS.core) },
      uFog: { value: new Vector2(8, 0.026) },
      uCamps: { value: Array.from({ length: 5 }, () => new Vector4()) },
      uRing: { value: new Vector3(0, 0, 0) },
      uHead: { value: new Vector4(0, 0, 0, 0) },
      uNoise: { value: noiseTexture() },
    },
    toneMapped: false,
  })
}

export type TerrainBuild = {
  geometry: BufferGeometry
  /** Run one per frame; the geometry (and `sample`) are ready after the last. */
  steps: (() => void)[]
  /** Bilinear height on the built grid: what the triangles show. Valid once the height steps ran. */
  sample: (x: number, z: number) => number
}

/**
 * The world as one grid: the 10 × 10 island at `segments` cells across, then cells that grow
 * outward to the horizon. Per vertex: position, a smooth normal, baked sun shadow (aSun) and
 * ambient occlusion (aAo). Work is split into short steps, one per frame, so building never
 * forms a long task.
 */
export function buildTerrain(segments: number): TerrainBuild {
  const xs = axisCoords(segments)
  const n = xs.length
  const ys = new Float32Array(n * n)
  const pos = new Float32Array(n * n * 3)
  const nor = new Float32Array(n * n * 3)
  const sun = new Float32Array(n * n)
  const ao = new Float32Array(n * n)
  const mot = new Float32Array(n * n)
  const geometry = new BufferGeometry()
  const sample = gridSampler(xs, ys)
  const steps: (() => void)[] = []
  const spacing = (i: number) => (xs[Math.min(n - 1, i + 1)] - xs[Math.max(0, i - 1)]) / 2

  const rows = (k: number, parts: number, fn: (j: number) => void) => () => {
    const per = Math.ceil(n / parts)
    const end = Math.min(n, (k + 1) * per)
    for (let j = k * per; j < end; j++) fn(j)
  }

  // 1. Heights.
  for (let k = 0; k < 4; k++)
    steps.push(
      rows(k, 4, (j) => {
        const z = xs[j]
        for (let i = 0; i < n; i++) {
          const x = xs[i]
          const o = j * n + i
          const y = worldY(x, z)
          ys[o] = y
          mot[o] = mottleAt(x, z)
          pos[o * 3] = x
          pos[o * 3 + 1] = y
          pos[o * 3 + 2] = z
        }
      }),
    )

  // 2. Normals from central differences (the grid spacing varies, so use the real distances).
  steps.push(() => {
    for (let j = 0; j < n; j++)
      for (let i = 0; i < n; i++) {
        const o = j * n + i
        const i0 = Math.max(0, i - 1)
        const i1 = Math.min(n - 1, i + 1)
        const j0 = Math.max(0, j - 1)
        const j1 = Math.min(n - 1, j + 1)
        const gx = (ys[j * n + i1] - ys[j * n + i0]) / (xs[i1] - xs[i0])
        const gz = (ys[j1 * n + i] - ys[j0 * n + i]) / (xs[j1] - xs[j0])
        const len = Math.hypot(gx, 1, gz)
        nor[o * 3] = -gx / len
        nor[o * 3 + 1] = 1 / len
        nor[o * 3 + 2] = -gz / len
      }
  })

  // 3. Sun shadows and occlusion, in ten slices.
  for (let k = 0; k < 10; k++)
    steps.push(
      rows(k, 10, (j) => {
        const z = xs[j]
        const cz = spacing(j)
        for (let i = 0; i < n; i++) {
          const x = xs[i]
          const o = j * n + i
          const cell = Math.max(cz, spacing(i))
          sun[o] = shadowAt(sample, x, ys[o], z, cell)
          ao[o] = occlusionAt(sample, x, ys[o], z, cell)
        }
      }),
    )

  // 4. Index and attributes.
  steps.push(() => {
    const cells = n - 1
    const index = new Uint32Array(cells * cells * 6)
    let o = 0
    // Near rows first (the camera sits on the +z side): the depth test then skips the far land
    // hidden behind them, instead of shading it and painting over it.
    for (let j = cells - 1; j >= 0; j--)
      for (let i = 0; i < cells; i++) {
        const a = j * n + i
        const b = a + 1
        const c = a + n
        const d = c + 1
        index[o++] = a
        index[o++] = c
        index[o++] = b
        index[o++] = b
        index[o++] = c
        index[o++] = d
      }
    geometry.setAttribute('position', new BufferAttribute(pos, 3))
    geometry.setAttribute('normal', new BufferAttribute(nor, 3))
    geometry.setAttribute('aSun', new BufferAttribute(sun, 1))
    geometry.setAttribute('aAo', new BufferAttribute(ao, 1))
    geometry.setAttribute('aMottle', new BufferAttribute(mot, 1))
    geometry.setIndex(new BufferAttribute(index, 1))
    geometry.computeBoundingSphere()
  })
  return { geometry, steps, sample }
}
