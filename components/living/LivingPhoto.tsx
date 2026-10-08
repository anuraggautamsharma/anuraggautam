'use client'
'use no memo' // React Compiler: this island drives WebGL imperatively from the shared loop

import { useEffect, useRef } from 'react'
import { damp, motion, subscribe, wake } from '@/components/motion/loop'
import { isReducedMotion, subscribeMotionPref } from '@/components/layout/motionPref'
import './living.css'

type Nav = Navigator & { connection?: { saveData?: boolean } }

/** Calm frame interval while nothing is being touched (clouds still drift). */
const AMBIENT_MS = 33

const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() { vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }
`

export type LivingScene = 'valley' | 'aurora' | 'lake' | 'ice' | 'canyon' | 'forest'
const SCENES: Record<LivingScene, number> = { valley: 0, aurora: 1, lake: 2, ice: 3, canyon: 4, forest: 5 }

/**
 * One pass over the photograph and its depth map (estimated offline, Depth Anything V2). Every
 * scene shares the camera: it leans with real parallax and pushes in as it passes. Then each
 * photograph does what its own world does:
 *   valley  clouds billow, their shadows cross the land, the sun follows the pointer
 *   aurora  the curtains flow and flicker; the lake below mirrors them in ripples
 *   lake    the water shimmers; the pointer sends rings across it
 *   ice     caustics swim through the blue ice; the pointer is a headlamp
 *   canyon  the pointer is the sun: light rakes across the hoodoos (normals from the depth map)
 *   forest  sunbeams pour through the canopy gaps toward the pointer; fireflies at night
 * In the dark theme each is graded to night (the aurora already is).
 */
const FRAG = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uImg;
uniform sampler2D uDepth;
uniform vec2 uScale;   // canvas uv -> image uv (cover, with a parallax margin)
uniform vec2 uCenter;  // image uv at the canvas centre
uniform vec2 uLook;    // -1..1, the camera's lean
uniform vec2 uSun;     // canvas uv: the light (or the pointer)
uniform float uSunA;
uniform float uDolly;  // 0..1, the push-in
uniform float uTime;
uniform float uAspect;
uniform float uNight;  // 0 day, 1 night (dark theme)
uniform float uScene;
uniform vec2 uVanish;
uniform float uSkyCut; // raw depth below which it is sky
uniform vec2 uTexel;   // 1 / depth map size
uniform float uPara;   // parallax strength (thin branches against sky want less)

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
float skyAt(vec2 uv) { return 1.0 - smoothstep(uSkyCut, uSkyCut + 0.04, texture2D(uDepth, uv).r); }
vec2 toImg(vec2 c) { vec2 u = uCenter + (c - 0.5) * uScale; u.y = 1.0 - u.y; return u; }

// Swimming light through ice or water (a tileable caustic, after Dave Hoskins).
float caustic(vec2 uv, float t) {
  vec2 p = mod(uv * 6.2831, 6.2831) - 250.0;
  vec2 i = p;
  float c = 1.0;
  for (int n = 0; n < 4; n++) {
    float tn = t * (1.0 - 3.5 / float(n + 1));
    i = p + vec2(cos(tn - i.x) + sin(tn + i.y), sin(tn - i.y) + cos(tn + i.x));
    c += 1.0 / length(vec2(p.x / (sin(i.x + tn) / 0.005), p.y / (cos(i.y + tn) / 0.005)));
  }
  c /= 4.0;
  c = 1.17 - pow(c, 1.4);
  return pow(abs(c), 8.0);
}

vec3 stars(vec2 c, float cloud) {
  vec2 sg = c * vec2(uAspect, 1.0) * 160.0;
  vec2 id = floor(sg);
  vec2 f = fract(sg) - 0.5;
  float h = hash(id);
  float s = step(0.965, h) * (1.0 - smoothstep(0.04, 0.16, length(f - (vec2(hash(id + 3.1), hash(id + 7.7)) - 0.5) * 0.6)));
  s *= 0.6 + 0.4 * sin(uTime * (1.0 + h * 3.0) + h * 50.0);
  vec2 sg2 = c * vec2(uAspect, 1.0) * 420.0;
  float s2 = step(0.985, hash(floor(sg2) + 11.0)) * (1.0 - smoothstep(0.05, 0.2, length(fract(sg2) - 0.5))) * 0.6;
  return vec3(0.85, 0.9, 1.0) * (s + s2) * (1.0 - cloud);
}

// Day for night: the land sinks into moonlit blue (its highlights stay silver); bright cloud
// stays moonlit cloud; the clear sky turns deep navy with stars.
vec3 nightGrade(vec3 day, float sky) {
  float l = dot(day, vec3(0.299, 0.587, 0.114));
  vec3 landN = mix(vec3(l), day, 0.22) * vec3(0.42, 0.52, 0.78);
  landN = landN * 0.55 + vec3(0.62, 0.74, 1.0) * pow(smoothstep(0.45, 0.95, l), 1.6) * 0.42;
  float cloud = smoothstep(0.55, 0.92, l);
  vec3 skyN = mix(mix(vec3(0.06, 0.09, 0.16), vec3(0.02, 0.035, 0.075), vUv.y), vec3(0.42, 0.5, 0.66) * l, cloud * 0.85);
  skyN += stars(vUv, cloud);
  return mix(landN, skyN, sky);
}

void main() {
  vec2 uv = toImg(vUv);

  // Dolly: zoom toward the vanishing point; near ground grows faster than the far (parallax).
  float d = depthAt(uv);
  uv = uVanish + (uv - uVanish) / (1.0 + uDolly * (0.015 + 0.09 * d * uPara));

  // Lean: shift by depth around a mid-ground focus plane, refined twice against the depth map.
  vec2 k = uLook * vec2(0.02, -0.012) * uPara;
  vec2 p = uv - k * (d - 0.35);
  p = uv - k * (depthAt(p) - 0.35);
  p = uv - k * (depthAt(p) - 0.35);
  uv = p;
  d = depthAt(uv);
  float sky = skyAt(uv);
  float land = 1.0 - sky;
  float t = uTime;
  vec2 dv = (vUv - uSun) * vec2(uAspect, 1.0);
  float r = length(dv);
  vec3 col;
  float tw = noise(uv * vec2(1400.0, 800.0) + vec2(t * 1.7, -t * 1.1));
  bool graded = true;

  if (uScene < 0.5) {
    // ── valley ──
    vec2 suv = uv;
    if (sky > 0.0) {
      vec2 c = uv * vec2(2.4, 4.0);
      vec2 q = vec2(fbm(c + vec2(t * 0.018, 0.0)), fbm(c + vec2(5.2, 1.3) - vec2(t * 0.014, t * 0.004)));
      suv = uv + (q - 0.5) * vec2(0.016, 0.008) + vec2(sin(t * 0.04) * 0.004, 0.0);
      sky *= skyAt(suv);
    }
    col = texture2D(uImg, mix(uv, suv, sky)).rgb;
    land = 1.0 - sky;
    float z = 0.14 + d;
    vec2 g = vec2((uv.x - 0.5) / z, 1.0 / z) * 0.55 + vec2(t * 0.03, t * 0.01);
    float s = smoothstep(0.42, 0.68, fbm(g)) * (1.0 - uNight * 0.75);
    col = mix(col, col * vec3(0.62, 0.67, 0.78), s * 0.42 * land * smoothstep(0.03, 0.12, d));
    float lum = dot(col, vec3(0.299, 0.587, 0.114));
    col += pow(tw, 14.0) * 1.6 * smoothstep(0.62, 0.86, lum) * land * (1.0 - s) * vec3(1.0, 0.97, 0.9) * (1.0 - uNight);
    if (uNight > 0.001) col = mix(col, nightGrade(col, sky), uNight);
    graded = false;
    // The sun (day) or the moon (night) at the pointer.
    float glow = uSunA * (0.5 * exp(-r * 9.0) + 0.22 * exp(-r * 2.4));
    col += glow * vec3(1.0, 0.84, 0.6) * mix(0.12, 1.0, sky) * (1.0 - uNight);
    col *= 1.0 + uSunA * 0.14 * smoothstep(0.5, 0.9, uSun.y) * exp(-abs(dv.x) * 1.8) * land * vec3(1.1, 1.0, 0.86) * (1.0 - uNight);
    float disc = 1.0 - smoothstep(0.022, 0.026, r);
    float halo = uSunA * (0.35 * exp(-r * 14.0) + 0.12 * exp(-r * 3.0));
    col += vec3(0.72, 0.82, 1.0) * halo * mix(0.25, 1.0, sky) * uNight;
    col = mix(col, vec3(0.95, 0.97, 1.0), disc * sky * uSunA * uNight);
    col *= 1.0 + uSunA * 0.35 * exp(-abs(dv.x) * 2.0) * land * vec3(0.85, 0.95, 1.15) * uNight;
  } else if (uScene < 1.5) {
    // ── aurora: curtains flow and flicker; the lake mirrors them, rippling ──
    float water = smoothstep(0.765, 0.785, uv.y);
    vec2 a = vec2(sin(uv.y * 7.0 + t * 0.4 + fbm(uv * 2.5 + t * 0.07) * 4.0) * 0.005, (fbm(vec2(uv.x * 4.0 - t * 0.1, t * 0.06)) - 0.5) * 0.008);
    vec2 w = vec2(sin(uv.y * 260.0 - t * 2.2 + noise(uv * vec2(30.0, 90.0)) * 5.0) * 0.0022, 0.0) * (uv.y - 0.76) * 6.0;
    vec2 suv = uv + a * sky + w * water;
    col = texture2D(uImg, suv).rgb;
    float rays = 0.86 + 0.3 * pow(fbm(vec2(uv.x * 9.0 + t * 0.12, uv.y * 1.5 + t * 0.05)), 1.4);
    float glowNear = exp(-r * 3.0) * uSunA * 0.25; // the sky brightens a little where you look
    col *= mix(1.0, rays + glowNear, max(sky, water * 0.75));
    col += pow(tw, 16.0) * 0.6 * water * vec3(0.7, 1.0, 0.85);
    col *= mix(1.0, 0.85, uNight);
    graded = false;
  } else if (uScene < 2.5) {
    // ── lake: shimmer, and rings from the pointer ──
    vec3 c0 = texture2D(uImg, uv).rgb;
    float wm = smoothstep(0.06, 0.16, c0.b - c0.r) * smoothstep(0.03, 0.12, c0.g - c0.r) * smoothstep(0.55, 0.62, uv.y);
    vec2 rip = vec2(sin(uv.y * 320.0 + t * 1.4 + noise(uv * vec2(24.0, 90.0)) * 6.0) * 0.0016, 0.0);
    float ring = sin(r * 140.0 - t * 7.0) * exp(-r * 9.0) * uSunA;
    vec2 rd = r > 0.0 ? dv / r : vec2(0.0);
    vec2 duv = (rip + rd * ring * 0.004 * vec2(1.0, -1.0)) * wm;
    col = texture2D(uImg, uv + duv).rgb;
    col += wm * (ring * 0.06 + pow(tw, 12.0) * 0.9) * vec3(0.85, 1.0, 1.0);
  } else if (uScene < 3.5) {
    // ── ice: caustics in the blue ice; the pointer is a headlamp ──
    col = texture2D(uImg, uv).rgb;
    float l = dot(col, vec3(0.299, 0.587, 0.114));
    float ice = smoothstep(0.05, 0.2, col.b - col.r) * smoothstep(0.12, 0.4, l);
    float cs = caustic(uv * vec2(1.6, 1.1) + vec2(0.0, t * 0.01), t * 0.35);
    float shimmer = (cs - 0.35) * ice;
    col *= 1.0 + shimmer * 0.45;
    col += vec3(0.75, 0.95, 1.0) * max(shimmer, 0.0) * l * 0.25;
    col *= mix(1.0, 0.42, uNight);
    float lamp = exp(-r * mix(4.5, 3.0, uNight)) * uSunA;
    col *= 1.0 + lamp * mix(0.3, 2.4, uNight) * vec3(1.0, 0.95, 0.88);
    col += lamp * max(shimmer, 0.0) * 0.25 * vec3(0.8, 0.97, 1.0);
    graded = false;
  } else if (uScene < 4.5) {
    // ── canyon: the pointer is the sun, raking across the hoodoos ──
    col = texture2D(uImg, uv + vec2(0.0, sin(uv.x * 80.0 + t * 3.0) * 0.0006 * sky)).rgb;
    float dx = depthAt(uv + vec2(uTexel.x * 2.0, 0.0)) - depthAt(uv - vec2(uTexel.x * 2.0, 0.0));
    float dy = depthAt(uv + vec2(0.0, uTexel.y * 2.0)) - depthAt(uv - vec2(0.0, uTexel.y * 2.0));
    vec3 n = normalize(vec3(-dx * 22.0, dy * 22.0, 1.0));
    vec3 L = normalize(vec3((uSun - 0.5) * vec2(2.2, 1.6), 0.55));
    float lam = dot(n, L);
    col *= mix(1.0, 0.78 + 0.5 * clamp(lam, 0.0, 1.0), land * 0.9) * mix(vec3(1.0), vec3(1.06, 1.0, 0.92), uSunA * land);
    col += vec3(1.0, 0.75, 0.45) * pow(clamp(lam, 0.0, 1.0), 6.0) * 0.12 * land;
  } else {
    // ── forest: sunbeams through the canopy toward the pointer; fireflies at night ──
    col = texture2D(uImg, uv).rgb;
    vec2 ls = toImg(uSun);
    vec2 dir = normalize(ls - uv + 1e-5);
    float reach = min(length(ls - uv), 0.45);
    vec2 stepv = dir * reach / 24.0;
    vec2 q = uv;
    float acc = 0.0;
    float wgt = 1.0;
    for (int i = 0; i < 24; i++) {
      q += stepv;
      float g = texture2D(uDepth, q).r;
      vec3 c = texture2D(uImg, q).rgb;
      // Only open, bright sky lets light in.
      acc += (1.0 - smoothstep(0.0, 0.05, g)) * smoothstep(0.62, 0.92, dot(c, vec3(0.333))) * wgt;
      wgt *= 0.93;
    }
    float shafts = 0.55 + 0.45 * fbm(vec2(atan(uv.y - ls.y, uv.x - ls.x) * 9.0, t * 0.12));
    float beams = smoothstep(0.0, 6.0, acc) * shafts * smoothstep(0.03, 0.35, length(uv - ls));
    vec3 beamC = mix(vec3(1.0, 0.86, 0.62), vec3(0.6, 0.72, 1.0), uNight);
    col = mix(col, col + beamC * 0.55, beams * mix(0.45, 0.3, uNight) * land);
    if (uNight > 0.001) {
      // Sky here is only what is both far and bright, with soft edges: thin branches and the
      // dark distant forest never get cut out.
      float l0 = dot(texture2D(uImg, uv).rgb, vec3(0.299, 0.587, 0.114));
      float skyB = (1.0 - smoothstep(0.0, 0.12, texture2D(uDepth, uv).r)) * smoothstep(0.5, 0.82, l0);
      col = mix(col, nightGrade(col, skyB) + beamC * beams * 0.3 * (1.0 - skyB), uNight);
      graded = false;
      // Fireflies over the path: a few warm points drifting and blinking.
      float ff = 0.0;
      for (int i = 0; i < 9; i++) {
        float fi = float(i);
        vec2 fp = vec2(0.15 + 0.7 * hash(vec2(fi, 1.3)) + 0.04 * sin(t * (0.3 + 0.2 * hash(vec2(fi, 4.0))) + fi), 0.12 + 0.35 * hash(vec2(fi, 7.1)) + 0.03 * cos(t * 0.4 + fi * 2.0));
        float blink = smoothstep(0.3, 1.0, sin(t * (0.8 + hash(vec2(fi, 2.2))) + fi * 3.0));
        float fr = length((vUv - fp) * vec2(uAspect, 1.0));
        ff += blink * (exp(-fr * 260.0) * 1.2 + exp(-fr * 40.0) * 0.12);
      }
      col += vec3(1.0, 0.85, 0.4) * ff * uNight;
    }
  }

  if (graded && uNight > 0.001) col = mix(col, nightGrade(col, sky), uNight);
  gl_FragColor = vec4(col, 1.0);
}
`

/**
 * A photograph brought to life in place, with no video: drop it beside a FullBleedPhoto in
 * its `.photo-stage`. The photo stays underneath (the fallback, and the first paint); the
 * canvas fades in over it once its first frame is drawn. Off under reduced motion, Save-Data,
 * or without WebGL.
 */
export function LivingPhoto({
  depth,
  scene = 'valley',
  fx = 0.5,
  fy = 0.55,
  vanish = [0.62, 0.6],
  skyCut = 0.02,
}: {
  depth: string
  scene?: LivingScene
  /** Focal point (image uv) the crop centres on. */
  fx?: number
  fy?: number
  /** Where the camera pushes in (image uv). */
  vanish?: [number, number]
  /** Raw depth below which the map is sky. */
  skyCut?: number
}) {
  const sceneN = SCENES[scene]
  const [vx, vy] = vanish
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    const stage = canvas?.parentElement
    const img = stage?.querySelector<HTMLImageElement>('.photo-img:not(.photo-night) img') ?? stage?.querySelector<HTMLImageElement>('img')
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
    let night = document.documentElement.dataset.theme === 'dark' ? 1 : 0
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
      for (const n of ['uImg', 'uDepth', 'uScale', 'uCenter', 'uLook', 'uSun', 'uSunA', 'uDolly', 'uTime', 'uAspect', 'uNight', 'uScene', 'uVanish', 'uSkyCut', 'uTexel', 'uPara'])
        u[n] = gl.getUniformLocation(prog, n)
      gl.uniform1i(u.uImg, 0)
      gl.uniform1i(u.uDepth, 1)
      gl.uniform1f(u.uScene, sceneN)
      gl.uniform2f(u.uVanish, vx, vy)
      gl.uniform1f(u.uSkyCut, skyCut)
      gl.uniform1f(u.uPara, scene === 'forest' ? 0.3 : scene === 'aurora' ? 0.6 : 1)
      try {
        // The photo is already on the page (same origin); the depth map is ~7 KB.
        const photo = img.complete && img.naturalWidth ? img : await load(img.currentSrc || img.src)
        if (dead) return
        imgAspect = photo.naturalWidth / photo.naturalHeight
        texture(photo, 0)
        const dm = await load(depth)
        if (dead) return
        gl.uniform2f(u.uTexel, 1 / dm.naturalWidth, 1 / dm.naturalHeight)
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
      // Pointer: a fine pointer over the photo leads the light and leans the camera.
      const p = motion.pointer
      const over = p.fine && p.y >= r.top && p.y <= r.bottom && p.x >= r.left && p.x <= r.right
      const px = (p.x - r.left) / r.width
      const py = 1 - (p.y - r.top) / r.height
      const tnight = document.documentElement.dataset.theme === 'dark' ? 1 : 0
      let tx = 0
      let ty = 0
      // Where the light rests with no pointer, per scene (canvas uv, y up), and how present it is.
      let tsx = scene === 'forest' ? 0.78 : scene === 'canyon' ? 0.5 + 0.38 * Math.sin(time * 0.18) : 0.74
      let tsy = scene === 'forest' ? 0.95 : scene === 'canyon' ? 0.8 : 0.8
      let tsa = scene === 'valley' ? (tnight ? 0.75 : 0.3) : scene === 'forest' || scene === 'canyon' ? 0.8 : 0
      // In the dark cave, with nobody holding the lamp, it rests on the ice.
      if (scene === 'ice') {
        tsx = 0.55 + 0.08 * Math.sin(time * 0.3)
        tsy = 0.5
        tsa = tnight ? 0.7 : 0
      }
      if (scene === 'valley' && tnight) {
        tsx = 0.7
        tsy = 0.82
      }
      if (over || drag) {
        tx = Math.max(-1, Math.min(1, px * 2 - 1))
        ty = Math.max(-1, Math.min(1, -py * 2 + 1))
        tsx = px
        // The valley's sun and moon stay in the sky: the pointer's height sets how high they ride.
        tsy = scene === 'valley' ? 0.62 + 0.34 * Math.min(1, Math.max(0, py)) : py
        tsa = 1
      } else {
        // Touch screens and idle: the scroll leans the camera, the view sways a touch.
        const prog01 = Math.min(1, Math.max(0, (vh - r.top) / (vh + r.height)))
        ty = (prog01 - 0.5) * 1.4
        tx = Math.sin(time * 0.25) * 0.35
      }
      const tdolly = Math.min(1, Math.max(0, (vh - r.top) / (vh + r.height)))
      const moving =
        Math.abs(tx - lx) + Math.abs(ty - ly) + Math.abs(tdolly - dolly) + Math.abs(tsa - sa) + Math.abs(tnight - night) > 0.002
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
      night = damp(night, tnight, 2.2, step)

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
      gl.uniform1f(u.uNight, night)
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
  }, [depth, fx, fy, sceneN, vx, vy, skyCut, scene])

  return <canvas ref={ref} className="living" aria-hidden="true" />
}
