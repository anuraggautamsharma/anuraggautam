'use client'
'use no memo' // React Compiler: this island drives WebGL imperatively from the shared loop

import { useEffect, useRef } from 'react'
import { damp, motion, subscribe, wake } from '@/components/motion/loop'
import { isReducedMotion, subscribeMotionPref } from '@/components/layout/motionPref'
import './living.css'

type Nav = Navigator & { connection?: { saveData?: boolean } }

/** Calm frame interval while nothing is being touched (clouds still drift). */
const AMBIENT_MS = 33
/** The vanishing point the camera pushes into, in image uv. */
const VANISH = [0.62, 0.6] as const

const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() { vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }
`

/**
 * One pass over the photograph and its depth map (estimated offline, Depth Anything V2):
 * the camera leans and pushes in with real parallax, the sky's clouds billow, their shadows
 * sweep the land, light glints on the river and snow, and the sun follows the pointer.
 */
const FRAG = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uImg;
uniform sampler2D uDepth;
uniform vec2 uScale;   // canvas uv -> image uv (cover, with a parallax margin)
uniform vec2 uCenter;  // image uv at the canvas centre
uniform vec2 uLook;    // -1..1, the camera's lean
uniform vec2 uSun;     // canvas uv
uniform float uSunA;
uniform float uDolly;  // 0..1, the push-in
uniform float uTime;
uniform float uAspect;

float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { s += a * noise(p); p = p * 2.03 + 17.1; a *= 0.5; }
  return s;
}
float depthAt(vec2 uv) { return pow(texture2D(uDepth, uv).r, 0.55); }

void main() {
  vec2 uv = uCenter + (vUv - 0.5) * uScale;
  uv.y = 1.0 - uv.y;

  // Dolly: zoom toward the valley; near ground grows faster than the far range (real parallax).
  vec2 vp = vec2(${VANISH[0]}, ${VANISH[1]});
  float d = depthAt(uv);
  uv = vp + (uv - vp) / (1.0 + uDolly * (0.015 + 0.09 * d));

  // Lean: shift by depth around a mid-ground focus plane, refined twice against the depth map.
  vec2 k = uLook * vec2(0.02, -0.012);
  vec2 p = uv - k * (d - 0.35);
  p = uv - k * (depthAt(p) - 0.35);
  p = uv - k * (depthAt(p) - 0.35);
  uv = p;
  float dr = texture2D(uDepth, uv).r;
  d = pow(dr, 0.55);
  float sky = 1.0 - smoothstep(0.02, 0.06, dr);

  // The sky breathes: a slow, evolving warp, kept off the peaks.
  vec2 suv = uv;
  if (sky > 0.0) {
    vec2 c = uv * vec2(2.4, 4.0);
    vec2 q = vec2(fbm(c + vec2(uTime * 0.018, 0.0)), fbm(c + vec2(5.2, 1.3) - vec2(uTime * 0.014, uTime * 0.004)));
    suv = uv + (q - 0.5) * vec2(0.016, 0.008) + vec2(sin(uTime * 0.04) * 0.004, 0.0);
    sky *= 1.0 - smoothstep(0.02, 0.06, texture2D(uDepth, suv).r);
  }
  vec3 col = texture2D(uImg, mix(uv, suv, sky)).rgb;
  float land = 1.0 - sky;

  // Cloud shadows: noise laid on the ground plane (x / depth, 1 / depth), blown by the wind.
  float z = 0.14 + d;
  vec2 g = vec2((uv.x - 0.5) / z, 1.0 / z) * 0.55 + vec2(uTime * 0.03, uTime * 0.01);
  float s = smoothstep(0.42, 0.68, fbm(g));
  col = mix(col, col * vec3(0.62, 0.67, 0.78), s * 0.42 * land * smoothstep(0.03, 0.12, d));

  // Glints on water and snow.
  float lum = dot(col, vec3(0.299, 0.587, 0.114));
  float tw = noise(uv * vec2(1400.0, 800.0) + vec2(uTime * 1.7, -uTime * 1.1));
  col += pow(tw, 14.0) * 1.6 * smoothstep(0.62, 0.86, lum) * land * (1.0 - s) * vec3(1.0, 0.97, 0.9);

  // The sun, wherever the pointer leads it.
  vec2 dv = (vUv - uSun) * vec2(uAspect, 1.0);
  float r = length(dv);
  float glow = uSunA * (0.5 * exp(-r * 9.0) + 0.22 * exp(-r * 2.4));
  col += glow * vec3(1.0, 0.84, 0.6) * mix(0.12, 1.0, sky);
  // On the land, only a warm wash below the sun, stronger as it climbs.
  col *= 1.0 + uSunA * 0.14 * smoothstep(0.5, 0.9, uSun.y) * exp(-abs(dv.x) * 1.8) * land * vec3(1.1, 1.0, 0.86);

  gl_FragColor = vec4(col, 1.0);
}
`

/**
 * A photograph brought to life in place, with no video: drop it beside a FullBleedPhoto in
 * its `.photo-stage`. The photo stays underneath (the fallback, and the first paint); the
 * canvas fades in over it once its first frame is drawn. Off under reduced motion, Save-Data,
 * or without WebGL.
 */
export function LivingPhoto({ depth, fx = 0.5, fy = 0.55 }: { depth: string; fx?: number; fy?: number }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    const stage = canvas?.parentElement
    const img = stage?.querySelector<HTMLImageElement>('.photo-img img')
    if (!canvas || !stage || !img) return
    if ((navigator as Nav).connection?.saveData) return

    let dead = false
    let gl: WebGLRenderingContext | null = null
    let prog: WebGLProgram | null = null
    let unsub: (() => void) | null = null
    let started = false
    let visible = false
    let ready = 0 // textures uploaded
    const u: Record<string, WebGLUniformLocation | null> = {}
    let time = 0
    let lastRender = 0
    let activeUntil = 0
    let w = 0
    let h = 0
    let imgAspect = 16 / 9
    // Damped state.
    let lx = 0
    let ly = 0
    let sx = 0.72
    let sy = 0.78
    let sa = 0.35
    let dolly = 0
    let drag = false

    const compile = (type: number, src: string) => {
      const s = gl!.createShader(type)!
      gl!.shaderSource(s, src)
      gl!.compileShader(s)
      if (!gl!.getShaderParameter(s, gl!.COMPILE_STATUS)) throw new Error(gl!.getShaderInfoLog(s) ?? 'shader')
      return s
    }

    const texture = (source: TexImageSource, unit: number) => {
      const t = gl!.createTexture()
      gl!.activeTexture(gl!.TEXTURE0 + unit)
      gl!.bindTexture(gl!.TEXTURE_2D, t)
      gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_S, gl!.CLAMP_TO_EDGE)
      gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_T, gl!.CLAMP_TO_EDGE)
      gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MIN_FILTER, gl!.LINEAR)
      gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MAG_FILTER, gl!.LINEAR)
      gl!.texImage2D(gl!.TEXTURE_2D, 0, gl!.RGB, gl!.RGB, gl!.UNSIGNED_BYTE, source)
      ready++
      wake()
    }

    const load = (src: string) =>
      new Promise<HTMLImageElement>((res, rej) => {
        const i = new Image()
        i.decoding = 'async'
        i.onload = () => res(i)
        i.onerror = rej
        i.src = src
      })

    const init = async () => {
      gl = canvas.getContext('webgl', { alpha: false, antialias: false, depth: false, stencil: false, powerPreference: 'low-power' })
      if (!gl) return
      try {
        prog = gl.createProgram()!
        gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT))
        gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG))
        gl.linkProgram(prog)
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) ?? 'link')
      } catch (err) {
        console.error('[living]', err)
        return
      }
      gl.useProgram(prog)
      const buf = gl.createBuffer()
      gl.bindBuffer(gl.ARRAY_BUFFER, buf)
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
      const loc = gl.getAttribLocation(prog, 'aPos')
      gl.enableVertexAttribArray(loc)
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
      for (const n of ['uImg', 'uDepth', 'uScale', 'uCenter', 'uLook', 'uSun', 'uSunA', 'uDolly', 'uTime', 'uAspect'])
        u[n] = gl.getUniformLocation(prog, n)
      gl.uniform1i(u.uImg, 0)
      gl.uniform1i(u.uDepth, 1)
      try {
        // The photo is already on the page (same origin); the depth map is ~7 KB.
        const photo = img.complete && img.naturalWidth ? img : await load(img.currentSrc || img.src)
        if (dead) return
        imgAspect = photo.naturalWidth / photo.naturalHeight
        texture(photo, 0)
        const dm = await load(depth)
        if (dead) return
        texture(dm, 1)
      } catch {
        /* no texture, no canvas: the photo stays */
      }
    }

    const size = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.25)
      const cw = Math.round(canvas.clientWidth * dpr)
      const ch = Math.round(canvas.clientHeight * dpr)
      if (cw !== w || ch !== h) {
        w = canvas.width = cw
        h = canvas.height = ch
        gl!.viewport(0, 0, w, h)
      }
    }

    const tick = (_t: number, dt: number) => {
      if (!gl || ready < 2 || !visible || document.visibilityState !== 'visible') return
      wake(120) // keep the clouds moving while in view
      const now = performance.now()
      const r = stage.getBoundingClientRect()
      const vh = window.innerHeight
      // Pointer: a fine pointer anywhere over the band leads the sun and leans the camera.
      const p = motion.pointer
      const over = p.fine && p.y >= r.top && p.y <= r.bottom
      let tx = 0
      let ty = 0
      let tsx = 0.74
      let tsy = 0.8
      let tsa = 0.3
      if (over || drag) {
        tx = Math.max(-1, Math.min(1, ((p.x - r.left) / r.width) * 2 - 1))
        ty = Math.max(-1, Math.min(1, ((p.y - r.top) / r.height) * 2 - 1))
        tsx = (p.x - r.left) / r.width
        // The sun stays in the sky: the pointer's height sets how high it rides.
        tsy = 0.62 + 0.34 * (1 - Math.min(1, Math.max(0, (p.y - r.top) / r.height)))
        tsa = 1
      } else {
        // Touch screens and idle: the scroll leans the camera, the view sways a touch.
        const prog01 = Math.min(1, Math.max(0, (vh - r.top) / (vh + r.height)))
        ty = (prog01 - 0.5) * 1.4
        tx = Math.sin(time * 0.25) * 0.35
      }
      const tdolly = Math.min(1, Math.max(0, (vh - r.top) / (vh + r.height)))
      const moving = Math.abs(tx - lx) + Math.abs(ty - ly) + Math.abs(tdolly - dolly) + Math.abs(tsa - sa) > 0.002
      if (moving || now - motion.lastInput < 400) activeUntil = now + 500
      if (now < activeUntil ? false : now - lastRender < AMBIENT_MS - 4) return
      const step = Math.min(dt || 1 / 60, 1 / 20)
      time += now < activeUntil ? step : Math.min((now - lastRender) / 1000, 1 / 10)
      lastRender = now
      lx = damp(lx, tx, 2.6, step)
      ly = damp(ly, ty, 2.6, step)
      sx = damp(sx, tsx, 5, step)
      sy = damp(sy, tsy, 5, step)
      sa = damp(sa, tsa, 3, step)
      dolly = damp(dolly, tdolly, 4, step)

      size()
      const aspect = w / h
      // Cover the canvas with the image, plus a 5% margin for the lean and the dolly.
      const m = 1.05
      let scx = 1 / m
      let scy = 1 / m
      if (aspect > imgAspect) scy = imgAspect / aspect / m
      else scx = aspect / imgAspect / m
      const cx = Math.min(1 - scx / 2, Math.max(scx / 2, fx))
      const cy = Math.min(1 - scy / 2, Math.max(scy / 2, 1 - fy))
      gl.uniform2f(u.uScale, scx, scy)
      gl.uniform2f(u.uCenter, cx, cy)
      gl.uniform2f(u.uLook, lx, ly)
      gl.uniform2f(u.uSun, sx, sy)
      gl.uniform1f(u.uSunA, sa)
      gl.uniform1f(u.uDolly, dolly)
      gl.uniform1f(u.uTime, time)
      gl.uniform1f(u.uAspect, aspect)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
      if (!canvas.hasAttribute('data-on')) canvas.setAttribute('data-on', '')
    }

    // Touch: dragging across the band leads the sun too.
    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') drag = true
    }
    const onUp = () => {
      drag = false
    }
    stage.addEventListener('pointerdown', onDown, { passive: true })
    window.addEventListener('pointerup', onUp, { passive: true })
    window.addEventListener('pointercancel', onUp, { passive: true })

    const io = new IntersectionObserver(
      ([e]) => {
        visible = !!e?.isIntersecting
        if (visible && !started && !isReducedMotion()) {
          started = true
          void init()
        }
        if (visible) {
          unsub ??= subscribe(tick)
          wake()
        } else {
          unsub?.()
          unsub = null
        }
      },
      { rootMargin: '50% 0px' },
    )
    io.observe(stage)
    const unsubPref = subscribeMotionPref(() => {
      if (isReducedMotion()) canvas.removeAttribute('data-on')
    })
    const onLost = (e: Event) => {
      e.preventDefault()
      canvas.removeAttribute('data-on')
      ready = 0
    }
    canvas.addEventListener('webglcontextlost', onLost)

    return () => {
      dead = true
      unsub?.()
      io.disconnect()
      unsubPref()
      stage.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
      canvas.removeEventListener('webglcontextlost', onLost)
      gl?.getExtension('WEBGL_lose_context')?.loseContext()
    }
  }, [depth, fx, fy])

  return <canvas ref={ref} className="living" aria-hidden="true" />
}
