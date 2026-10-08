'use client'
'use no memo' // React Compiler: this file drives a WebGL root and mutates three objects every frame

import { useEffect, useRef } from 'react'
import { _roots, advance, createRoot, extend, useFrame, type ReconcilerRoot, type RootState } from '@react-three/fiber'
import { type BufferGeometry, type Material, Mesh, NoToneMapping, type Matrix4, type PerspectiveCamera, SRGBColorSpace, type Texture, Vector3, type Vector4 } from 'three'
import { damp, motion, setEngine, subscribe, wake } from '@/components/motion/loop'
import { CAMP_ORDER, CAMP_XZ } from '@/lib/terrain'
import { CAMPS, ROI, TRAILHEAD_MAP, smoothstep } from './route'
import { routeState, topoDebug } from './topo-state'
import { CameraRig, FOV } from './scene/camera'
import { GpuTimer, Governor, dprCap, isWeakGpu, noteGpu } from './scene/governor'
import { createRibbon, routeAt } from './scene/ribbon'
import { COLORS } from './scene/shaders'
import { type TerrainBuild, buildTerrain, createBackdrop, createSky, createTerrainMaterial } from './scene/terrain'

// Lean root: only the one element the JSX uses is registered (no <Canvas>, no full namespace).
extend({ Mesh })

/** Terrain segments: 256² (≈66k vertices). The map is fill-bound, so steps trade pixels, not vertices. */
const SEGMENTS = 256
/** Governor steps scale the pixel ratio: full, then 80 %, 64 %, 50 %. Slow never means off. */
const DPR_STEPS = [1, 0.8, 0.64, 0.5] as const
/** Ambient frame interval (mist, clouds, drift) while nothing is being scrolled or pointed at. */
const AMBIENT_MS = { strong: 33, weak: 50 } as const
/** Aerial haze: clear up to 0.55× the camera distance, then exponential (per world unit). */
const FOG = { clear: 0.7, density: 0.026 } as const
/** How long pins and the route head glide from the poster to the 3D map. */
const ENTER_MS = 450

export type TopoSceneProps = {
  canvas: HTMLCanvasElement
  onLive: () => void
  /** permanent = stay on the SVG map for the rest of the session (context loss, governor, failure). */
  onRetreat: (permanent: boolean) => void
}

/** The renderer string, for the `?topo-debug` readout. */
function gpuName(gl: WebGL2RenderingContext) {
  const info = gl.getExtension('WEBGL_debug_renderer_info')
  return String(info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)).replace(/^ANGLE \((.*)\)$/, '$1').slice(0, 80)
}

/** True when a cached px value is stale (NaN-safe: an unset cache always counts as moved). */
const moved = (a: number, b: number) => !(Math.abs(a - b) <= 0.1)

/** One tick of the shared loop (the app's only requestAnimationFrame). */
const nextFrame = () =>
  new Promise<void>((resolve) => {
    const un = subscribe(() => {
      un()
      resolve()
    })
  })

type Host = {
  timer: GpuTimer
  layer: HTMLElement
  setSize: (w: number, h: number) => void
  setDpr: (dpr: number) => void
  retreat: (permanent: boolean) => void
  live: () => void
}

/**
 * Frame controller. Renders only when something changed: route progress (routeState.rev),
 * the camera still travelling, a camp glow easing, or a resize. Each rendered frame also
 * projects the five camps and the route head and moves the DOM pins onto them.
 */
class Controller {
  private readonly backdrop = createBackdrop()
  readonly sky = createSky(this.backdrop)
  readonly terrainMaterial = createTerrainMaterial(this.backdrop)
  private glowAt = 0
  readonly ribbon: ReturnType<typeof createRibbon>
  terrainGeometry: BufferGeometry
  /** Height on the built grid (what the triangles show): pins, the ribbon and the head sit on it. */
  private readonly ground: TerrainBuild['sample']
  private readonly rig = new CameraRig()
  private readonly gov: Governor
  private readonly glow = [0, 0, 0, 0, 0]
  /** The ring marks the active camp: it moves on arrival and fades in there. */
  private ring = 0
  private ringAt = -1
  private readonly anchors: Vector3[]
  private readonly head = new Vector3()
  /** Seconds since the scene went live (drift, clouds, mist, the lantern's pulse). */
  private time = 0
  /** Damped pointer offset from the stage centre, −1…1. */
  private px = 0
  private py = 0
  private readonly pinAt = CAMP_ORDER.map(() => ({ x: NaN, y: NaN, off: false }))
  private readonly headAt = { x: NaN, y: NaN }
  private readonly v = new Vector3()
  private lastRev = -1
  private moving = true
  private glowing = true
  /** 0 day, 1 night: eases toward the page theme, so a switch is a dusk, not a cut. */
  private night = document.documentElement.dataset.theme === 'dark' ? 1 : 0
  private sizeDirty = true
  // False until the IntersectionObserver reports, so a deep link below the map never pays for frames.
  private visible = false
  private dead = false
  private frames = 0
  private w = 1
  private h = 1
  private io: IntersectionObserver | null = null
  private ro: ResizeObserver | null = null
  private resizeTimer = 0

  constructor(
    build: TerrainBuild,
    private readonly host: Host,
  ) {
    this.terrainGeometry = build.geometry
    this.ground = build.sample
    this.ribbon = createRibbon(build.sample)
    this.anchors = CAMP_ORDER.map((id) => {
      const [x, z] = CAMP_XZ[id]
      return new Vector3(x, build.sample(x, z) + 0.02, z)
    })
    this.gov = new Governor((level) => this.step(level))
  }

  /** Development only: `window.__topo` reads the map's GPU cost and quality level. */
  get diagnostics() {
    return { gpuMs: this.host.timer.ms, level: this.gov.level, frames: this.frames }
  }

  start(track: Element) {
    this.io = new IntersectionObserver(([e]) => {
      this.visible = !!e?.isIntersecting
      if (this.visible) wake()
    })
    this.io.observe(track)
    this.ro = new ResizeObserver(() => this.scheduleResize())
    this.ro.observe(this.host.layer)
    this.measure()
  }

  dispose() {
    this.dead = true
    this.io?.disconnect()
    this.ro?.disconnect()
    clearTimeout(this.resizeTimer)
    this.host.timer.dispose()
    this.terrainGeometry.dispose()
    ;(this.terrainMaterial.uniforms.uNoise.value as Texture).dispose()
    this.terrainMaterial.dispose()
    this.ribbon.geometry.dispose()
    this.ribbon.material.dispose()
    this.sky.geometry.dispose()
    this.sky.material.dispose()
    const dom = routeState.dom
    if (dom) {
      for (const pin of dom.pins) {
        pin.style.removeProperty('transform')
        pin.removeAttribute('data-off')
      }
      dom.head?.style.removeProperty('transform')
    }
  }

  /** The plane's on-screen box in layer px (after CSS), which the pins and the framing are placed from. */
  private box = { x: 0, y: 0, w: 1, h: 1 }
  /** Portrait screens: a taller lens and a step back, so the climb still fits the frame. */
  private zoom = 1

  private measure() {
    const r = this.host.layer.getBoundingClientRect()
    this.w = Math.max(1, r.width)
    this.h = Math.max(1, r.height)
    const plane = routeState.dom?.plane
    if (plane) {
      const p = plane.getBoundingClientRect()
      this.box = { x: p.left - r.left, y: p.top - r.top, w: Math.max(1, p.width), h: Math.max(1, p.height) }
    } else {
      const L = routeState.layout
      this.box = { x: L.x, y: L.y, w: L.w, h: L.h }
    }
    this.sizeDirty = true
  }

  private scheduleResize() {
    clearTimeout(this.resizeTimer)
    this.resizeTimer = window.setTimeout(() => {
      if (this.dead) return
      this.measure()
      this.host.setSize(this.w, this.h)
      this.host.setDpr(dprCap(DPR_STEPS[Math.min(this.gov.level, DPR_STEPS.length - 1)]))
      wake()
    }, 150)
  }

  /**
   * Governor steps trade pixels only (80 %, 64 %, 50 %), with no rebuilds and no hitches. A slow
   * machine keeps the 3D map at its lightest; only a real failure falls back to the SVG.
   */
  private step(level: number) {
    if (level >= DPR_STEPS.length) return
    this.host.setDpr(dprCap(DPR_STEPS[level]))
    this.sizeDirty = true
  }

  /** Full rate while the climb, the camera or the pointer is moving; a calm ambient rate otherwise. */
  private activeUntil = 0
  private lastRender = 0
  private debugAt = 0
  gpuName = ''

  shouldRender = () => {
    if (this.dead || !this.visible || document.visibilityState !== 'visible') return false
    const now = performance.now()
    const nightTo = document.documentElement.dataset.theme === 'dark' ? 1 : 0
    if (routeState.rev !== this.lastRev || this.moving || now - motion.lastInput < 400 || Math.abs(this.night - nightTo) > 0.002)
      this.activeUntil = now + 500
    if (now < this.activeUntil || this.frames < 2 || this.sizeDirty) return true
    return now - this.lastRender >= (isWeakGpu() ? AMBIENT_MS.weak : AMBIENT_MS.strong) - 4
  }

  frame = (state: RootState, delta: number) => {
    if (this.dead) return
    const camera = state.camera as PerspectiveCamera
    const dt = this.frames ? Math.min(Math.max(delta, 0), 1 / 20) : 0
    const now = performance.now()
    // Only full-rate frames are timed: ambient frames are slow on purpose.
    if (now < this.activeUntil) this.gov.sample(now, this.host.timer.poll())
    else {
      this.gov.pause()
      this.host.timer.poll()
    }
    this.lastRender = now
    if (this.sizeDirty) {
      this.frameView(camera)
      this.sizeDirty = false
    }
    this.lastRev = routeState.rev
    this.time += dt
    // Pointer parallax: only a fine pointer over the stage leans the view.
    const p = motion.pointer
    const tx = p.fine ? Math.max(-1, Math.min(1, (p.x / this.w) * 2 - 1)) : 0
    const ty = p.fine ? Math.max(-1, Math.min(1, (p.y / this.h) * 2 - 1)) : 0
    this.px = dt ? damp(this.px, tx, 2.2, dt) : tx
    this.py = dt ? damp(this.py, ty, 2.2, dt) : ty
    routeAt(routeState.uS, this.head, this.ground)
    this.moving = this.rig.update({ p: routeState.p, head: this.head, px: this.px, py: this.py, time: this.time, zoom: this.zoom }, dt, camera)
    const nightTo = document.documentElement.dataset.theme === 'dark' ? 1 : 0
    this.night = dt ? damp(this.night, nightTo, 2.5, dt) : nightTo
    if (Math.abs(this.night - nightTo) < 0.002) this.night = nightTo
    this.backdrop.uNight.value = this.night

    this.ribbon.material.uniforms.uProgress.value = routeState.uS
    this.ribbon.material.uniforms.uTime.value = this.time
    const tu = this.terrainMaterial.uniforms
    tu.uTime.value = this.time
    const lantern = tu.uHead.value as Vector4
    lantern.set(this.head.x, this.head.z, routeState.uS > 0.002 && routeState.uS < 0.998 ? 1 : 0, 0)
    const dist = this.rig.distance
    tu.uFog.value.set(dist * FOG.clear, FOG.density)
    ;(this.backdrop.uInvViewProj.value as Matrix4).multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse).invert()
    const camps = tu.uCamps.value as Vector4[]
    const a = routeState.active
    this.glowing = false
    for (let i = 0; i < 5; i++) {
      const g = i === a ? 1 : i < a ? 0.4 : 0
      this.glow[i] = dt ? damp(this.glow[i], g, 6, dt) : g
      if (Math.abs(this.glow[i] - g) > 0.002) this.glowing = true
      else this.glow[i] = g
      camps[i]?.set(this.anchors[i].x, this.anchors[i].z, this.glow[i], 0)
    }
    if (a !== this.ringAt) {
      this.ringAt = a
      this.ring = 0
    }
    const ringTo = a >= 0 ? 1 : 0
    this.ring = dt ? damp(this.ring, ringTo, 5, dt) : ringTo
    if (Math.abs(this.ring - ringTo) > 0.002) this.glowing = true
    else this.ring = ringTo
    const at = this.anchors[a]
    const ringU = tu.uRing.value as Vector3
    ringU.set(at?.x ?? 0, at?.z ?? 0, at ? this.ring : 0)

    // Sunrise behind the summit: rises over the last camp and stays through the outro.
    const want = smoothstep(0.62, 0.92, routeState.uS)
    this.glowAt = dt ? damp(this.glowAt, want, 2, dt) : want
    state.gl.getDrawingBufferSize(this.backdrop.uRes.value)
    const bg = this.backdrop.uBg.value
    if (this.glowAt > 0.002) {
      const dpr = state.gl.getPixelRatio()
      this.v.copy(this.anchors[this.anchors.length - 1]).project(camera)
      bg.set(((this.v.x + 1) / 2) * this.w * dpr, ((this.v.y + 1) / 2) * this.h * dpr + this.h * dpr * 0.16, this.h * dpr * 0.42, this.glowAt)
    } else bg.w = 0

    this.host.timer.begin()
    state.gl.render(state.scene, camera)
    this.host.timer.end()
    this.frames++
    if (now - this.debugAt > 500) {
      this.debugAt = now
      topoDebug(
        `3D map: live\nGPU: ${this.gpuName}${isWeakGpu() ? ' (weak: light mode)' : ''}\npixel ratio ${state.gl.getPixelRatio().toFixed(2)} · step ${this.gov.level}\nmap GPU ${this.host.timer.ms < 0 ? 'n/a' : this.host.timer.ms.toFixed(1) + ' ms'} · frames ${this.frames}`,
      )
    }
    this.placeDom(camera)
    if (this.frames === 1) this.host.live()
    // Live mode can restyle the plane (phones flatten their tilted poster): re-measure once it has.
    if (this.frames === 3) this.scheduleResize()
  }

  /** Aspect, plus a view offset that puts the look-at point where the poster centres its route. */
  private frameView(camera: PerspectiveCamera) {
    const L = routeState.layout
    const B = this.box
    camera.aspect = this.w / this.h
    const portrait = camera.aspect < 1
    camera.fov = portrait ? 52 : FOV
    this.zoom = portrait ? 1.5 : 1
    let sx = B.x + ((ROI.x - L.fx) / L.fw) * B.w - this.w / 2
    let sy = B.y + ((ROI.y - L.fy) / L.fh) * B.h - this.h / 2
    if (!Number.isFinite(sx)) sx = 0
    if (!Number.isFinite(sy)) sy = 0
    sx = Math.max(-0.3 * this.w, Math.min(0.3 * this.w, sx))
    sy = Math.max(-0.2 * this.h, Math.min(0.2 * this.h, sy))
    camera.setViewOffset(this.w, this.h, -sx, -sy, this.w, this.h)
    camera.updateProjectionMatrix()
  }

  /** Moves the DOM pins and route head onto the projected camps (deltas from their poster spots). */
  private placeDom(camera: PerspectiveCamera) {
    const dom = routeState.dom
    if (!dom) return
    const L = routeState.layout
    const B = this.box
    const toX = (mx: number) => B.x + ((mx - L.fx) / L.fw) * B.w
    const toY = (my: number) => B.y + ((my - L.fy) / L.fh) * B.h
    for (let i = 0; i < this.anchors.length; i++) {
      const pin = dom.pins[i]
      const base = CAMPS[i]
      if (!pin || !base) continue
      this.v.copy(this.anchors[i]).project(camera)
      const x = ((this.v.x + 1) / 2) * this.w
      const y = ((1 - this.v.y) / 2) * this.h
      const off = this.v.z > 1 || x < -60 || x > this.w + 60 || y < -40 || y > this.h + 80
      const dx = x - toX(base.x)
      const dy = y - toY(base.y)
      const at = this.pinAt[i]
      if (moved(at.x, dx) || moved(at.y, dy)) {
        pin.style.transform = `translate3d(${dx.toFixed(1)}px,${dy.toFixed(1)}px,0)`
        at.x = dx
        at.y = dy
      }
      if (off !== at.off) {
        pin.toggleAttribute('data-off', off)
        at.off = off
      }
    }
    if (dom.head) {
      routeAt(routeState.uS, this.v, this.ground).project(camera)
      const dx = ((this.v.x + 1) / 2) * this.w - toX(TRAILHEAD_MAP.x)
      const dy = ((1 - this.v.y) / 2) * this.h - toY(TRAILHEAD_MAP.y)
      if (moved(this.headAt.x, dx) || moved(this.headAt.y, dy)) {
        dom.head.style.transform = `translate3d(${dx.toFixed(1)}px,${dy.toFixed(1)}px,0)`
        this.headAt.x = dx
        this.headAt.y = dy
      }
    }
  }
}

type MeshesProps = {
  frame: Controller['frame']
  sky: { geometry: BufferGeometry; material: Material }
  terrain: { geometry: BufferGeometry; material: Material }
  ribbon: { geometry: BufferGeometry; material: Material }
}

function Meshes({ frame, sky, terrain, ribbon }: MeshesProps) {
  // Priority 1 hands rendering to the controller (it renders, then places the DOM pins).
  useFrame(frame, 1)
  return (
    <>
      <mesh geometry={sky.geometry} material={sky.material} renderOrder={-1} frustumCulled={false} />
      <mesh geometry={terrain.geometry} material={terrain.material} frustumCulled={false} />
      <mesh geometry={ribbon.geometry} material={ribbon.material} renderOrder={1} frustumCulled={false} />
    </>
  )
}

/**
 * The 3D route map (desktop, behind TopoGate). Poster first: the SVG stays until this
 * renders its first frame, then the canvas fades in and the pins glide onto the terrain.
 * Zero downloads beyond this chunk: the terrain is computed, the colours are uniforms.
 */
export default function TopoScene(props: TopoSceneProps) {
  const { canvas } = props
  const cbs = useRef(props)
  useEffect(() => {
    cbs.current = props
  })

  useEffect(() => {
    let cancelled = false
    let root: ReconcilerRoot<HTMLCanvasElement> | null = null
    let ctl: Controller | null = null
    let enterTimer = 0
    const layer = canvas.parentElement
    const stage = canvas.closest<HTMLElement>('[data-route-stage]')
    const track = canvas.closest<HTMLElement>('[data-route-track]')
    const retreat = (permanent: boolean) => {
      if (!cancelled) cbs.current.onRetreat(permanent)
    }
    const onLost = (e: Event) => {
      e.preventDefault()
      if (process.env.NODE_ENV !== 'production') console.info('[topo] WebGL context lost')
      retreat(false) // the GPU reset (driver, sleep): try again on the next visit, not never
    }
    canvas.addEventListener('webglcontextlost', onLost)

    const boot = async () => {
      // A frame of grace: StrictMode's mount/unmount/mount cancels here before any GPU work.
      await nextFrame()
      if (cancelled) return
      if (!layer || !stage || !track) throw new Error('route stage not found')
      const rect = layer.getBoundingClientRect()
      const dpr = dprCap()
      root = createRoot(canvas)
      await root.configure({
        size: { width: Math.max(1, rect.width), height: Math.max(1, rect.height), top: 0, left: 0 },
        dpr,
        frameloop: 'never',
        flat: true,
        gl: { antialias: dpr <= 1, alpha: false, stencil: false, depth: true, powerPreference: 'default' },
        camera: { fov: FOV, near: 0.1, far: 320, position: [0, 12, 16], manual: true },
      })
      if (cancelled) return
      // The store exists once configured; reading it here keeps the first render synchronous.
      const store = _roots.get(canvas)?.store
      if (!store) throw new Error('R3F root missing after configure')
      const { gl, scene, camera } = store.getState()
      // Weak GPUs start on a smaller pixel budget (known only now that the context exists).
      const ctx2 = gl.getContext() as WebGL2RenderingContext
      if (noteGpu(ctx2)) store.getState().setDpr(dprCap())
      gl.toneMapping = NoToneMapping
      gl.outputColorSpace = SRGBColorSpace
      gl.setClearColor(COLORS.paper, 1)

      // Heights in four chunks plus the index, one per frame, so no long task forms.
      const build = buildTerrain(SEGMENTS)
      for (const step of build.steps) {
        await nextFrame()
        if (cancelled) {
          build.geometry.dispose()
          return
        }
        step()
      }

      ctl = new Controller(build, {
        timer: new GpuTimer(gl.getContext() as WebGL2RenderingContext),
        layer,
        setSize: (w, h) => store.getState().setSize(w, h, 0, 0),
        setDpr: (d) => store.getState().setDpr(d),
        retreat,
        live: () => {
          // First frame on screen: crossfade, and the scene takes over the pins and route head.
          routeState.gl = true
          stage.setAttribute('data-gl', 'enter')
          enterTimer = window.setTimeout(() => stage.setAttribute('data-gl', 'live'), ENTER_MS)
          cbs.current.onLive()
        },
      })
      root.render(
        <Meshes
          frame={ctl.frame}
          sky={ctl.sky}
          terrain={{ geometry: ctl.terrainGeometry, material: ctl.terrainMaterial }}
          ribbon={ctl.ribbon}
        />,
      )
      await nextFrame()
      if (cancelled) return
      // Compile off the main thread (KHR_parallel_shader_compile). Chrome only advances it on a
      // command-buffer flush, and nothing else draws to this context yet, so flush each frame;
      // after ~2 s stop waiting and let the first render finish the link.
      const ctx = gl.getContext()
      let compiled = false
      const settle = () => {
        compiled = true
      }
      void gl.compileAsync(scene, camera).then(settle, settle)
      for (let i = 0; !compiled && i < 120; i++) {
        ctx.flush()
        await nextFrame()
        if (cancelled) return
      }
      ctl.gpuName = gpuName(ctx2)
      ctl.start(track)
      setEngine({ shouldRender: ctl.shouldRender, frame: (t) => advance(t / 1000) })
      if (process.env.NODE_ENV !== 'production') {
        const live = ctl
        Object.defineProperty(window, '__topo', { configurable: true, get: () => live.diagnostics })
      }
    }

    boot().catch((err: unknown) => {
      if (process.env.NODE_ENV !== 'production') console.warn('[topo] staying on the SVG map:', err)
      retreat(true)
    })

    return () => {
      cancelled = true
      if (process.env.NODE_ENV !== 'production') Reflect.deleteProperty(window, '__topo')
      canvas.removeEventListener('webglcontextlost', onLost) // unmount forces a context loss: not a failure
      clearTimeout(enterTimer)
      setEngine(null)
      routeState.gl = false
      stage?.removeAttribute('data-gl')
      ctl?.dispose()
      root?.unmount()
    }
  }, [canvas])

  return null
}
