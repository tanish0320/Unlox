/**
 * Procedural Web Audio API sound effects for chalk writing and falling powder
 * Vernacular Visual Teacher - Zero external audio file dependencies
 */

export class ChalkAudioEngine {
  private ctx: AudioContext | null = null
  public enabled: boolean = true
  private writingNode: {
    source: AudioBufferSourceNode
    lfo: OscillatorNode
    gain: GainNode
  } | null = null
  public isWriting: boolean = false
  public volume: number = 0.35

  init(): void {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (AudioCtx) {
        this.ctx = new AudioCtx()
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {})
    }
  }

  toggleSound(): boolean {
    this.enabled = !this.enabled
    return this.enabled
  }

  startWriting(): void {
    if (!this.enabled) return
    this.init()
    if (!this.ctx || this.isWriting) return

    this.isWriting = true
    const ctx = this.ctx

    const bufferSize = ctx.sampleRate * 2
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const output = noiseBuffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1
      output[i] = white * 0.7 + Math.random() * 0.3
    }

    const whiteNoise = ctx.createBufferSource()
    whiteNoise.buffer = noiseBuffer
    whiteNoise.loop = true

    const bandpass = ctx.createBiquadFilter()
    bandpass.type = 'bandpass'
    bandpass.frequency.setValueAtTime(1400, ctx.currentTime)
    bandpass.Q.setValueAtTime(3.5, ctx.currentTime)

    const highpass = ctx.createBiquadFilter()
    highpass.type = 'highpass'
    highpass.frequency.setValueAtTime(800, ctx.currentTime)

    const lfo = ctx.createOscillator()
    lfo.frequency.setValueAtTime(12, ctx.currentTime)
    const lfoGain = ctx.createGain()
    lfoGain.gain.setValueAtTime(500, ctx.currentTime)
    lfo.connect(bandpass.frequency)
    lfo.start()

    const gainNode = ctx.createGain()
    gainNode.gain.setValueAtTime(0.001, ctx.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.18 * this.volume, ctx.currentTime + 0.08)

    whiteNoise.connect(highpass)
    highpass.connect(bandpass)
    bandpass.connect(gainNode)
    gainNode.connect(ctx.destination)

    whiteNoise.start()

    this.writingNode = {
      source: whiteNoise,
      lfo,
      gain: gainNode
    }
  }

  stopWriting(): void {
    if (!this.writingNode || !this.isWriting) return
    this.isWriting = false
    try {
      if (this.ctx) {
        const ctx = this.ctx
        const gain = this.writingNode.gain
        const source = this.writingNode.source
        const lfo = this.writingNode.lfo
        gain.gain.setValueAtTime(gain.gain.value, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.06)
        setTimeout(() => {
          try {
            source.stop()
            lfo.stop()
          } catch {}
        }, 70)
      }
    } catch {}
    this.writingNode = null
  }

  playPowderFall(): void {
    if (!this.enabled) return
    this.init()
    if (!this.ctx) return

    const ctx = this.ctx
    const now = ctx.currentTime
    const duration = 0.9

    const bufferSize = Math.floor(ctx.sampleRate * duration)
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const output = noiseBuffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * 0.8
    }

    const noise = ctx.createBufferSource()
    noise.buffer = noiseBuffer

    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(2400, now)
    filter.frequency.exponentialRampToValueAtTime(260, now + duration)

    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.001, now)
    gain.gain.linearRampToValueAtTime(0.24 * this.volume, now + 0.08)
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration)

    noise.connect(filter)
    filter.connect(gain)
    gain.connect(ctx.destination)

    noise.start(now)

    setTimeout(() => {
      this.playChalkTap(0.12)
    }, 280)
  }

  playChalkTap(delaySec: number = 0): void {
    if (!this.enabled) return
    this.init()
    if (!this.ctx) return

    const ctx = this.ctx
    const t = ctx.currentTime + delaySec

    const osc = ctx.createOscillator()
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(380, t)
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.04)

    const tapGain = ctx.createGain()
    tapGain.gain.setValueAtTime(0.15 * this.volume, t)
    tapGain.gain.exponentialRampToValueAtTime(0.001, t + 0.04)

    osc.connect(tapGain)
    tapGain.connect(ctx.destination)

    osc.start(t)
    osc.stop(t + 0.05)
  }
}
