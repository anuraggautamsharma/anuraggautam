import { BufferAttribute, BufferGeometry, ShaderMaterial, Vector2, Vector3, Vector4 } from 'three'
import { TERRAIN, heightAt } from '@/lib/terrain'
import { COLORS, srgb, terrainFragment, terrainVertex } from './shaders'

const v3 = (hex: string) => new Vector3(...srgb(hex))

/** One material for every terrain build: ramp, flat shading, contours, camp glow and ring, edge, fog. */
export function createTerrainMaterial() {
  const sun = new Vector3(-0.55, 0.62, -0.58).normalize() // north-west, ~38° up
  return new ShaderMaterial({
    vertexShader: terrainVertex,
    fragmentShader: terrainFragment,
    uniforms: {
      uH: { value: TERRAIN.H },
      uPaper: { value: v3(COLORS.paper) },
      uInk: { value: v3(COLORS.ink) },
      uIce: { value: v3(COLORS.ice) },
      uShadow: { value: v3(COLORS.shadow) },
      uWarm: { value: v3(COLORS.warm) },
      uGlow: { value: v3(COLORS.glow) },
      uCore: { value: v3(COLORS.core) },
      uSun: { value: sun },
      uFog: { value: new Vector2(12, 30) },
      uCamps: { value: Array.from({ length: 5 }, () => new Vector4()) },
      uRing: { value: new Vector3(0, 0, 0) },
    },
    toneMapped: false,
  })
}

export type TerrainBuild = {
  geometry: BufferGeometry
  /** Run one per frame (four height chunks, then the index); the geometry is ready after the last. */
  steps: (() => void)[]
}

/**
 * The 10 × 10 heightfield as a (segments)² grid, heights written once on the CPU from
 * lib/terrain.ts. Positions only: no normals (the shader derives facets), no UVs.
 */
export function buildTerrain(segments: number): TerrainBuild {
  const n = segments + 1
  const half = TERRAIN.size / 2
  const pos = new Float32Array(n * n * 3)
  const geometry = new BufferGeometry()
  const rowsPerStep = Math.ceil(n / 4)
  const steps: (() => void)[] = []
  for (let k = 0; k < 4; k++) {
    steps.push(() => {
      const end = Math.min(n, (k + 1) * rowsPerStep)
      for (let j = k * rowsPerStep; j < end; j++) {
        const z = -half + (TERRAIN.size * j) / segments
        for (let i = 0; i < n; i++) {
          const x = -half + (TERRAIN.size * i) / segments
          const o = (j * n + i) * 3
          pos[o] = x
          pos[o + 1] = heightAt(x, z) * TERRAIN.H
          pos[o + 2] = z
        }
      }
    })
  }
  steps.push(() => {
    const count = segments * segments * 6
    const index = n * n > 65535 ? new Uint32Array(count) : new Uint16Array(count)
    let o = 0
    for (let j = 0; j < segments; j++)
      for (let i = 0; i < segments; i++) {
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
    geometry.setIndex(new BufferAttribute(index, 1))
    geometry.computeBoundingSphere()
  })
  return { geometry, steps }
}
