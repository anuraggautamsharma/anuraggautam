import { BufferAttribute, BufferGeometry, ShaderMaterial, Vector3 } from 'three'
import { ROUTE_3D } from './route-3d.generated'
import { COLORS, ribbonFragment, ribbonVertex, srgb } from './shaders'

/** Ribbon width (world): the core is the middle quarter, the rest is halo. */
const WIDTH = 0.16
const LIFT = 0.035
const COUNT = ROUTE_3D.length / 2

type Ground = (x: number, z: number) => number

/** Route point at progress u (world units), on the given ground. */
export function routeAt(u: number, out: Vector3, ground: Ground) {
  const f = Math.min(1, Math.max(0, u)) * (COUNT - 1)
  const i = Math.min(COUNT - 2, Math.floor(f))
  const t = f - i
  const x = ROUTE_3D[i * 2] + (ROUTE_3D[i * 2 + 2] - ROUTE_3D[i * 2]) * t
  const z = ROUTE_3D[i * 2 + 1] + (ROUTE_3D[i * 2 + 3] - ROUTE_3D[i * 2 + 1]) * t
  return out.set(x, ground(x, z) + LIFT, z)
}

/**
 * The route as a strip draped on the built terrain: per vertex aT (progress, 0–1) and aSide (±1).
 * One draw call; the shader draws walked vs planned from uProgress.
 */
export function createRibbon(ground: Ground) {
  const pos = new Float32Array(COUNT * 2 * 3)
  const aT = new Float32Array(COUNT * 2)
  const aSide = new Float32Array(COUNT * 2)
  for (let i = 0; i < COUNT; i++) {
    const x = ROUTE_3D[i * 2]
    const z = ROUTE_3D[i * 2 + 1]
    const a = Math.max(0, i - 1)
    const b = Math.min(COUNT - 1, i + 1)
    let dx = ROUTE_3D[b * 2] - ROUTE_3D[a * 2]
    let dz = ROUTE_3D[b * 2 + 1] - ROUTE_3D[a * 2 + 1]
    const len = Math.hypot(dx, dz) || 1
    dx /= len
    dz /= len
    // Side vector, perpendicular in plan; each edge vertex sits on the ground beneath it,
    // never below the centre line (so the halo doesn't sink into a gully).
    const sx = -dz * (WIDTH / 2)
    const sz = dx * (WIDTH / 2)
    const cy = ground(x, z) + LIFT
    for (const [k, side] of [
      [0, 1],
      [1, -1],
    ] as const) {
      const vx = x + sx * side
      const vz = z + sz * side
      const o = (i * 2 + k) * 3
      pos[o] = vx
      pos[o + 1] = Math.max(ground(vx, vz) + LIFT, cy - 0.01)
      pos[o + 2] = vz
      aT[i * 2 + k] = i / (COUNT - 1)
      aSide[i * 2 + k] = side
    }
  }
  const index = new Uint16Array((COUNT - 1) * 6)
  // Counter-clockwise seen from above (normals up), so back-face culling keeps the strip.
  for (let i = 0, o = 0; i < COUNT - 1; i++) {
    const a = i * 2
    index[o++] = a
    index[o++] = a + 2
    index[o++] = a + 1
    index[o++] = a + 1
    index[o++] = a + 2
    index[o++] = a + 3
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(pos, 3))
  geometry.setAttribute('aT', new BufferAttribute(aT, 1))
  geometry.setAttribute('aSide', new BufferAttribute(aSide, 1))
  geometry.setIndex(new BufferAttribute(index, 1))
  geometry.computeBoundingSphere()

  const material = new ShaderMaterial({
    vertexShader: ribbonVertex,
    fragmentShader: ribbonFragment,
    uniforms: {
      uProgress: { value: 0 },
      uTime: { value: 0 },
      uCore: { value: new Vector3(...srgb(COLORS.core)) },
      uPaper: { value: new Vector3(...srgb(COLORS.paper)) },
      uInk: { value: new Vector3(...srgb(COLORS.ink)) },
      uTip: { value: new Vector3(...srgb(COLORS.tip)) },
    },
    transparent: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -4,
    polygonOffsetUnits: -4,
    toneMapped: false,
  })
  return { geometry, material }
}
