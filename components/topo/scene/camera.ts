import { type PerspectiveCamera, Vector3 } from 'three'
import { TERRAIN, heightAt } from '@/lib/terrain'
import { legAt } from '../route'

export const FOV = 30
const DEG = Math.PI / 180

/** A camera chapter, Mapbox-storytelling style: look at `c` (x, z) from `dist`, `elev`° up, `azim`° about y from +z. */
type Chapter = { c: readonly [number, number]; dist: number; elev: number; azim: number }

/** One chapter per route key frame: overview, the five camps, then the outro. */
export const CHAPTERS: readonly Chapter[] = [
  { c: [-0.6, 1.0], dist: 17, elev: 60, azim: -18 }, // overview
  { c: [-2.4, 2.6], dist: 8, elev: 46, azim: -24 }, // Position
  { c: [-0.2, 2.9], dist: 8, elev: 46, azim: -8 }, // Price
  { c: [-1.9, 0.9], dist: 7.5, elev: 48, azim: -30 }, // Market
  { c: [-0.7, 0.4], dist: 7.5, elev: 50, azim: -14 }, // Systems
  { c: [0.5, -0.4], dist: 8, elev: 54, azim: 0 }, // Team
  { c: [-0.6, 1.0], dist: 16, elev: 64, azim: -10 }, // outro
]

const TARGET_Y = CHAPTERS.map(({ c: [x, z] }) => heightAt(x, z) * TERRAIN.H + 0.2)
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

/**
 * The camera wanted at pinned progress p. Chapters blend with the route's own eased leg
 * fraction, so the camera arrives at a camp exactly as the route does. Returns the distance.
 */
export function cameraFor(p: number, pos: Vector3, target: Vector3) {
  const { i, f } = legAt(p)
  const a = CHAPTERS[i]
  const b = CHAPTERS[Math.min(CHAPTERS.length - 1, i + 1)]
  const cx = lerp(a.c[0], b.c[0], f)
  const cz = lerp(a.c[1], b.c[1], f)
  const ty = lerp(TARGET_Y[i], TARGET_Y[Math.min(TARGET_Y.length - 1, i + 1)], f)
  const dist = Math.exp(lerp(Math.log(a.dist), Math.log(b.dist), f)) // zoom feels even in log space
  const el = lerp(a.elev, b.elev, f) * DEG
  const az = lerp(a.azim, b.azim, f) * DEG
  target.set(cx, ty, cz)
  pos.set(cx + dist * Math.sin(az) * Math.cos(el), ty + dist * Math.sin(el), cz + dist * Math.cos(az) * Math.cos(el))
  return dist
}

/** Follows the wanted camera with a damped lerp (1 − e^(−3.5·dt)) on position and target. */
export class CameraRig {
  readonly pos = new Vector3()
  readonly target = new Vector3()
  private readonly wantPos = new Vector3()
  private readonly wantTarget = new Vector3()
  private primed = false

  /** Moves the camera; true while it is still travelling. `dt` 0 snaps. */
  update(p: number, dt: number, camera: PerspectiveCamera) {
    cameraFor(p, this.wantPos, this.wantTarget)
    let moving = false
    if (!this.primed || dt <= 0) {
      this.pos.copy(this.wantPos)
      this.target.copy(this.wantTarget)
      this.primed = true
    } else {
      const k = 1 - Math.exp(-3.5 * dt)
      this.pos.lerp(this.wantPos, k)
      this.target.lerp(this.wantTarget, k)
      // Settled once the remaining travel is under 1e-4 world units: then snap and stop rendering.
      moving = this.pos.distanceToSquared(this.wantPos) > 1e-8 || this.target.distanceToSquared(this.wantTarget) > 1e-8
      if (!moving) {
        this.pos.copy(this.wantPos)
        this.target.copy(this.wantTarget)
      }
    }
    camera.position.copy(this.pos)
    camera.lookAt(this.target)
    camera.updateMatrixWorld()
    return moving
  }

  /** Current eye-to-target distance (drives the fog). */
  get distance() {
    return this.pos.distanceTo(this.target)
  }
}
