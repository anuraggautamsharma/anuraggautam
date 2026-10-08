// The mountain, as sound: a generative ambient score made live with Web Audio, so there is no
// file to download. A slow, breathing pad (four voicings that drift into one another), wind that
// thickens in the clouds, an occasional far-off chime, all through one soft reverb. The page's
// story steers it: the wind rises through the cloud flight, and the chord opens into a warm major
// as the sun breaks at the summit. Loaded only when someone turns the sound on.

const NOTE = (n: number) => 440 * 2 ** ((n - 69) / 12)

/** Voicings (MIDI): dawn-cool suspended chords, then the sunrise. */
const CHORDS = {
  night: [
    [38, 45, 52, 57, 62, 66],
    [36, 43, 50, 55, 62, 64],
    [41, 48, 55, 60, 64, 69],
    [38, 45, 52, 57, 64, 69],
  ],
  sunrise: [43, 50, 55, 59, 62, 66, 71],
}
const CHIMES = [74, 76, 79, 81, 83, 86, 88]

type Voice = { osc: OscillatorNode; osc2: OscillatorNode; gain: GainNode }

export type Ambient = {
  /** True if the browser lets this page play sound without a gesture right now. */
  canAutoplay(): Promise<boolean>
  start(): Promise<void>
  stop(): Promise<void>
  /** 0–1 each: how deep in the cloud flight, and how close to the summit sunrise. */
  steer(clouds: number, summit: number): void
  /** A camp lights up on the route: a clear bell, one step higher for each camp. */
  camp(i: number): void
  dispose(): void
}

function impulse(ctx: AudioContext, seconds: number, decay: number) {
  const rate = ctx.sampleRate
  const len = Math.floor(rate * seconds)
  const buf = ctx.createBuffer(2, len, rate)
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c)
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** decay
  }
  return buf
}

function noise(ctx: AudioContext, seconds: number) {
  // Pinkish noise (Voss-McCartney-lite): softer than white, closer to air.
  const len = Math.floor(ctx.sampleRate * seconds)
  const buf = ctx.createBuffer(1, len, ctx.sampleRate)
  const d = buf.getChannelData(0)
  let b0 = 0
  let b1 = 0
  let b2 = 0
  for (let i = 0; i < len; i++) {
    const w = Math.random() * 2 - 1
    b0 = 0.99765 * b0 + w * 0.099046
    b1 = 0.963 * b1 + w * 0.2965164
    b2 = 0.57 * b2 + w * 1.0526913
    d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.12
  }
  return buf
}

export function createAmbient(): Ambient {
  const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
  const ctx = new Ctx({ latencyHint: 'playback' })
  const master = ctx.createGain()
  master.gain.value = 0
  const comp = ctx.createDynamicsCompressor()
  comp.threshold.value = -24
  comp.ratio.value = 3
  master.connect(comp).connect(ctx.destination)

  const verb = ctx.createConvolver()
  verb.buffer = impulse(ctx, 4.5, 2.6)
  const wet = ctx.createGain()
  wet.gain.value = 0.55
  verb.connect(wet).connect(master)
  const dry = ctx.createGain()
  dry.gain.value = 0.5
  dry.connect(master)

  // ── Pad ──
  const padFilter = ctx.createBiquadFilter()
  padFilter.type = 'lowpass'
  padFilter.frequency.value = 900
  padFilter.Q.value = 0.4
  const padBus = ctx.createGain()
  padBus.gain.value = 0.16
  padFilter.connect(padBus)
  padBus.connect(dry)
  padBus.connect(verb)

  const voices: Voice[] = []
  const first = CHORDS.night[0]
  for (let i = 0; i < 7; i++) {
    const f = NOTE(first[i % first.length] + (i >= first.length ? 12 : 0))
    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.value = f
    const osc2 = ctx.createOscillator()
    osc2.type = 'triangle'
    osc2.frequency.value = f
    osc2.detune.value = 6 + i * 2
    const gain = ctx.createGain()
    gain.gain.value = i < first.length ? 0.14 : 0
    const g2 = ctx.createGain()
    g2.gain.value = 0.35
    osc.connect(gain)
    osc2.connect(g2).connect(gain)
    gain.connect(padFilter)
    // Each voice breathes on its own slow cycle.
    const lfo = ctx.createOscillator()
    lfo.frequency.value = 1 / (9 + i * 2.7)
    const depth = ctx.createGain()
    depth.gain.value = 0.05
    lfo.connect(depth).connect(gain.gain)
    lfo.start()
    osc.start()
    osc2.start()
    voices.push({ osc, osc2, gain })
  }

  // ── Wind ──
  const wind = ctx.createBufferSource()
  wind.buffer = noise(ctx, 6)
  wind.loop = true
  const windBand = ctx.createBiquadFilter()
  windBand.type = 'bandpass'
  windBand.frequency.value = 520
  windBand.Q.value = 0.7
  const windGain = ctx.createGain()
  windGain.gain.value = 0.05
  const gust = ctx.createOscillator()
  gust.frequency.value = 1 / 13
  const gustDepth = ctx.createGain()
  gustDepth.gain.value = 260
  gust.connect(gustDepth).connect(windBand.frequency)
  wind.connect(windBand).connect(windGain)
  windGain.connect(dry)
  windGain.connect(verb)
  gust.start()
  wind.start()

  // ── Chimes: now and then, a far bell ──
  let chimeTimer = 0
  /** One bell: `note` picks the pitch (a rising scale for the camps), `level` its loudness. */
  const bell = (n: number, level = 0.035, panTo = Math.random() * 1.4 - 0.7) => {
    {
      const t = ctx.currentTime
      const o = ctx.createOscillator()
      o.type = 'sine'
      o.frequency.value = NOTE(n)
      const o2 = ctx.createOscillator()
      o2.type = 'sine'
      o2.frequency.value = NOTE(n) * 2.76 // a bell's inharmonic partial
      const g = ctx.createGain()
      g.gain.setValueAtTime(0, t)
      g.gain.linearRampToValueAtTime(level, t + 0.02)
      g.gain.exponentialRampToValueAtTime(0.0001, t + 5)
      const g2 = ctx.createGain()
      g2.gain.value = 0.25
      o.connect(g)
      o2.connect(g2).connect(g)
      const pan = ctx.createStereoPanner()
      pan.pan.value = panTo
      g.connect(pan)
      pan.connect(verb)
      pan.connect(dry)
      o.start(t)
      o2.start(t)
      o.stop(t + 5.2)
      o2.stop(t + 5.2)
    }
  }
  const chime = () => {
    if (ctx.state === 'running') bell(CHIMES[Math.floor(Math.random() * CHIMES.length)])
    chimeTimer = window.setTimeout(chime, 7000 + Math.random() * 9000)
  }

  // ── Chord drift ──
  let chordIdx = 0
  let chordTimer = 0
  let sunrise = 0
  const voice = (notes: number[], glide: number) => {
    const t = ctx.currentTime
    voices.forEach((v, i) => {
      const n = notes[i]
      if (n === undefined) {
        v.gain.gain.setTargetAtTime(0, t, glide)
        return
      }
      const f = NOTE(n)
      v.osc.frequency.setTargetAtTime(f, t, glide)
      v.osc2.frequency.setTargetAtTime(f, t, glide)
      v.gain.gain.setTargetAtTime(0.14, t, glide)
    })
  }
  const drift = () => {
    if (sunrise < 0.5) {
      chordIdx = (chordIdx + 1) % CHORDS.night.length
      voice(CHORDS.night[chordIdx], 3.5)
    }
    chordTimer = window.setTimeout(drift, 14000 + Math.random() * 6000)
  }

  let playing = false
  return {
    async canAutoplay() {
      const nav = navigator as Navigator & { getAutoplayPolicy?: (t: string) => string }
      if (nav.getAutoplayPolicy) return nav.getAutoplayPolicy('audiocontext') === 'allowed'
      try {
        await Promise.race([ctx.resume(), new Promise((r) => setTimeout(r, 300))])
      } catch {
        /* blocked */
      }
      return (ctx.state as string) === 'running'
    },
    async start() {
      if (playing) return
      playing = true
      await ctx.resume()
      const t = ctx.currentTime
      master.gain.cancelScheduledValues(t)
      master.gain.setValueAtTime(master.gain.value, t)
      master.gain.linearRampToValueAtTime(0.9, t + 2.5)
      chimeTimer = window.setTimeout(chime, 4000)
      chordTimer = window.setTimeout(drift, 12000)
    },
    async stop() {
      if (!playing) return
      playing = false
      window.clearTimeout(chimeTimer)
      window.clearTimeout(chordTimer)
      const t = ctx.currentTime
      master.gain.cancelScheduledValues(t)
      master.gain.setValueAtTime(master.gain.value, t)
      master.gain.linearRampToValueAtTime(0, t + 0.8)
      await new Promise((r) => setTimeout(r, 900))
      // Suspended, the context costs nothing.
      if (!playing) await ctx.suspend()
    },
    steer(clouds, summit) {
      const t = ctx.currentTime
      // The wind thickens and brightens in the cloud flight.
      windGain.gain.setTargetAtTime(0.04 + clouds * 0.11, t, 0.8)
      windBand.frequency.setTargetAtTime(480 + clouds * 420, t, 1.2)
      // The sun breaks: the pad opens and resolves into the sunrise chord.
      padFilter.frequency.setTargetAtTime(900 + summit * 1700, t, 1.2)
      if (summit > 0.5 && sunrise <= 0.5) voice(CHORDS.sunrise, 1.8)
      else if (summit <= 0.3 && sunrise > 0.3) voice(CHORDS.night[chordIdx], 2.5)
      sunrise = summit
    },
    camp(i) {
      if (!playing || ctx.state !== 'running') return
      const scale = [74, 76, 79, 81, 83]
      bell(scale[Math.max(0, Math.min(4, i))], 0.06, -0.4 + i * 0.2)
    },
    dispose() {
      window.clearTimeout(chimeTimer)
      window.clearTimeout(chordTimer)
      void ctx.close()
    },
  }
}
