let weakGpu = false

/**
 * Integrated and mobile-class GPUs (Intel UHD / Iris, Mali, Adreno, PowerVR, software) get a
 * smaller pixel budget from the first frame. Call once the context exists.
 */
export function noteGpu(gl: WebGL2RenderingContext) {
  const info = gl.getExtension('WEBGL_debug_renderer_info')
  const name = String(info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER))
  weakGpu = /intel|uhd|iris|hd graphics|mali|adreno|powervr|swiftshader|llvmpipe/i.test(name)
  return weakGpu
}

export const isWeakGpu = () => weakGpu

/**
 * Pixel budget for the canvas: ≤ 1.25× and ≤ 2.2 MP, or ≤ 1× and ≤ 1.3 MP on a weak GPU (the
 * misty landscape upscales gracefully). `scale` is the governor's step down.
 */
export function dprCap(scale = 1) {
  const d = window.devicePixelRatio || 1
  const px = Math.max(1, window.innerWidth * window.innerHeight)
  const [max, budget] = weakGpu ? [1, 1.3e6] : [1.25, 2.2e6]
  return Math.max(0.5, Math.min(d, max, Math.sqrt(budget / px)) * scale)
}

const WARMUP_MS = 1500
const WINDOW = 60
const SLOW_MS = 22
/** With a GPU timer, the map's own draw must cost at least this much for a step to help. */
const GPU_SIGNIFICANT_MS = 6

type TimerExt = { TIME_ELAPSED_EXT: number; GPU_DISJOINT_EXT: number }

/**
 * GPU time of the map's draw calls via EXT_disjoint_timer_query_webgl2 (Chrome desktop).
 * Results arrive a few frames late; `ms` holds the latest, −1 while unknown or unsupported.
 */
export class GpuTimer {
  ms = -1
  private readonly ext: TimerExt | null
  private readonly pending: WebGLQuery[] = []
  private active: WebGLQuery | null = null

  constructor(private readonly gl: WebGL2RenderingContext) {
    this.ext = gl.getExtension('EXT_disjoint_timer_query_webgl2') as TimerExt | null
  }

  get available() {
    return !!this.ext
  }

  begin() {
    if (!this.ext || this.active || this.pending.length > 4) return
    const q = this.gl.createQuery()
    if (!q) return
    this.gl.beginQuery(this.ext.TIME_ELAPSED_EXT, q)
    this.active = q
  }

  end() {
    if (!this.ext || !this.active) return
    this.gl.endQuery(this.ext.TIME_ELAPSED_EXT)
    this.pending.push(this.active)
    this.active = null
  }

  /** Collects finished queries; returns the latest GPU time in ms (−1 if none yet). */
  poll() {
    const { gl, ext } = this
    if (!ext) return -1
    const disjoint = gl.getParameter(ext.GPU_DISJOINT_EXT) as boolean
    while (this.pending.length) {
      const q = this.pending[0]
      if (!gl.getQueryParameter(q, gl.QUERY_RESULT_AVAILABLE)) break
      const ns = gl.getQueryParameter(q, gl.QUERY_RESULT) as number
      this.pending.shift()
      gl.deleteQuery(q)
      if (!disjoint) this.ms = ns / 1e6
    }
    return this.ms
  }

  dispose() {
    for (const q of this.pending) this.gl.deleteQuery(q)
    this.pending.length = 0
    if (this.active) this.gl.deleteQuery(this.active)
    this.active = null
  }
}

/**
 * Adaptive quality, sampled on rendered frames only: when the average interval over 60
 * consecutive full-rate frames passes 22 ms, step down (1: 80 % pixels, 2: 64 %, 3: retreat).
 * Two guards against blaming the map for a slow page: the bar rises to 1.5× the fastest
 * interval in the window (a display or battery saver capping rAF at 30 Hz), and where a GPU
 * timer exists the map's own draw must cost ≥ 6 ms. Gaps (idle, hidden tab) and the first
 * 1.5 s after going live or stepping are ignored.
 */
export class Governor {
  level = 0
  private last = 0
  private since = 0
  private sum = 0
  private n = 0
  private fastest = Infinity
  private gpuSum = 0
  private gpuN = 0

  constructor(private readonly onStep: (level: number) => void) {}

  /** The next sample follows a gap (an ambient frame, not a scroll frame): don't time it. */
  pause() {
    this.last = 0
  }

  /** `gpuMs`: the map's latest GPU time, or −1 when unmeasured. */
  sample(now: number, gpuMs = -1) {
    const dt = this.last ? now - this.last : 0
    this.last = now
    if (!this.since) this.since = now
    if (now - this.since < WARMUP_MS || dt <= 0 || dt > 100) return
    this.sum += dt
    this.n++
    if (dt > 4) this.fastest = Math.min(this.fastest, dt)
    if (gpuMs >= 0) {
      this.gpuSum += gpuMs
      this.gpuN++
    }
    if (this.n < WINDOW) return
    const avg = this.sum / this.n
    const bar = Math.max(SLOW_MS, 1.5 * this.fastest)
    const gpu = this.gpuN ? this.gpuSum / this.gpuN : -1
    this.sum = this.n = this.gpuSum = this.gpuN = 0
    this.fastest = Infinity
    if (avg <= bar) return
    if (gpu >= 0 && gpu < GPU_SIGNIFICANT_MS) {
      if (process.env.NODE_ENV !== 'production')
        console.info(`[topo] slow frames (${avg.toFixed(1)} ms) but the map costs ${gpu.toFixed(1)} ms on the GPU: holding quality`)
      return
    }
    this.level++
    this.since = now
    if (process.env.NODE_ENV !== 'production')
      console.info(`[topo] governor step ${this.level}: frames ${avg.toFixed(1)} ms, map GPU ${gpu < 0 ? 'unmeasured' : `${gpu.toFixed(1)} ms`}`)
    this.onStep(this.level)
  }
}
