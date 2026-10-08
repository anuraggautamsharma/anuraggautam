import { type PerspectiveCamera, Vector3 } from 'three'
import { legAt } from '../route'
import { surfaceY } from './surface'

export const FOV = 38
const DEG = Math.PI / 180

/** A camera chapter: look at `c` (x, z) from `dist`, `elev`° up, `azim`° about y from +z. */
type Chapter = { c: readonly [number, number]; dist: number; elev: number; azim: number }

/**
 * One chapter per route key frame: overview, the five camps, then the outro. Low angles
 * from the sunlit side, so the ridges, shadows and the summit read as a landscape, not a map.
 */
export const CHAPTERS: readonly Chapter[] = [
  { c: [-0.3, 0.4], dist: 15, elev: 21, azim: -22 }, // overview: the massif against its skyline
  { c: [-2.4, 2.6], dist: 6.6, elev: 25, azim: -38 }, // Position
  { c: [-0.2, 2.9], dist: 6.4, elev: 23, azim: -12 }, // Price
  { c: [-1.9, 0.9], dist: 6.4, elev: 26, azim: -44 }, // Market
  { c: [-0.7, 0.4], dist: 6.2, elev: 25, azim: -20 }, // Systems
  { c: [0.5, -0.6], dist: 7.6, elev: 22, azim: -8 }, // Team
  { c: [-0.4, 0.4], dist: 14, elev: 19, azim: 14 }, // outro
]

const TARGET_Y = CHAPTERS.map(({ c: [x, z] }) => surfaceY(x, z) + 0.15)
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

/** How much the look-at point leans towards the climber between camps. */
const FOLLOW = 0.35

export type CameraInput = {
  /** Pinned progress, 0–1. */
  p: number
  /** The route head (world), or null before the scene knows it. */
  head: Vector3 | null
  /** Pointer offset from the stage centre, −1…1 on each axis. */
  px: number
  py: number
  /** Seconds, for the idle drift. */
  time: number
  /** Distance multiplier (portrait screens step back). */
  zoom?: number
}

/** The camera wanted for the input. Chapters blend with the route's own eased leg fraction. Returns the distance. */
export function cameraFor(input: CameraInput, pos: Vector3, target: Vector3) {
  const { i, f } = legAt(input.p)
  const a = CHAPTERS[i]
  const b = CHAPTERS[Math.min(CHAPTERS.length - 1, i + 1)]
  const cx = lerp(a.c[0], b.c[0], f)
  const cz = lerp(a.c[1], b.c[1], f)
  const ty = lerp(TARGET_Y[i], TARGET_Y[Math.min(TARGET_Y.length - 1, i + 1)], f)
  let dist = Math.exp(lerp(Math.log(a.dist), Math.log(b.dist), f)) // zoom feels even in log space
  // Portrait steps back for the close camp shots, and comes in a touch for the wide ones.
  const z = input.zoom ?? 1
  if (z !== 1) dist *= lerp(z, 0.85, Math.min(1, Math.max(0, (dist - 8) / 6)))
  // The pointer leans the view a few degrees; the idle drift keeps the air moving.
  const drift = Math.sin(input.time * 0.12) * 1.6
  const el = (lerp(a.elev, b.elev, f) - input.py * 2.5) * DEG
  const az = (lerp(a.azim, b.azim, f) + input.px * 4 + drift) * DEG
  target.set(cx, ty, cz)
  // Between camps the view leans after the climber (not on the overview or the outro).
  const follow = i === 0 ? FOLLOW * f : i >= CHAPTERS.length - 2 ? FOLLOW * (1 - f) : FOLLOW
  if (input.head) target.lerp(input.head, follow)
  pos.set(target.x + dist * Math.sin(az) * Math.cos(el), target.y + dist * Math.sin(el), target.z + dist * Math.cos(az) * Math.cos(el))
  return dist
}

/** Follows the wanted camera with a damped lerp (1 − e^(−2.6·dt)) on position and target. */
export class CameraRig {
  readonly pos = new Vector3()
  readonly target = new Vector3()
  private readonly wantPos = new Vector3()
  private readonly wantTarget = new Vector3()
  private primed = false

  /** Moves the camera; true while it is still travelling. `dt` 0 snaps. */
  update(input: CameraInput, dt: number, camera: PerspectiveCamera) {
    cameraFor(input, this.wantPos, this.wantTarget)
    let moving = false
    if (!this.primed || dt <= 0) {
      this.pos.copy(this.wantPos)
      this.target.copy(this.wantTarget)
      this.primed = true
    } else {
      const k = 1 - Math.exp(-2.6 * dt)
      this.pos.lerp(this.wantPos, k)
      this.target.lerp(this.wantTarget, k)
      // Still travelling (not just the slow idle drift): keeps the scene at full frame rate.
      moving = this.pos.distanceToSquared(this.wantPos) > 1e-3 || this.target.distanceToSquared(this.wantTarget) > 1e-3
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
