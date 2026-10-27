/**
 * Fullscreen Realistic Chalkboard and Ultra-Fast Chalk Powder Physics Engine
 * Vernacular Visual Teacher - React / TypeScript Engine
 */

import { ChalkAudioEngine } from './soundEffects'

export interface GreetingItem {
  lang: string
  name: string
  script: string
  subtext: string
  font: string
  fontSize: number
  yOffset: number
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  gravity: number
  drag: number
  sway: number
  swaySpeed: number
  swayAmp: number
  alpha: number
  fade: number
  size: number
  color: string
  settled: boolean
  life: number
  maxLife: number
}

interface Spark {
  x: number
  y: number
  vx: number
  vy: number
  alpha: number
  size: number
  color: string
}

interface TrayDust {
  x: number
  y: number
  alpha: number
  size: number
  color: string
}

export class ChalkboardEngine {
  private container: HTMLElement
  public canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private offscreen: HTMLCanvasElement
  private offCtx: CanvasRenderingContext2D
  private surfaceCanvas: HTMLCanvasElement
  private surfaceCtx: CanvasRenderingContext2D

  public greetings: GreetingItem[] = [
    {
      lang: 'en',
      name: 'English',
      script: 'Hello',
      subtext: 'Welcome to Blu Visual Teacher',
      font: "'Caveat', cursive, sans-serif",
      fontSize: 145,
      yOffset: 0
    },
    {
      lang: 'hi',
      name: 'हिन्दी',
      script: 'नमस्ते',
      subtext: 'Hindi',
      font: "'Noto Sans Devanagari', 'Nirmala UI', 'Mangal', sans-serif",
      fontSize: 135,
      yOffset: -8
    },
    {
      lang: 'kn',
      name: 'ಕನ್ನಡ',
      script: 'ನಮಸ್ಕಾರ',
      subtext: 'Kannada',
      font: "'Noto Sans Kannada', 'Nirmala UI', 'Tunga', sans-serif",
      fontSize: 120,
      yOffset: -6
    },
    {
      lang: 'ta',
      name: 'தமிழ்',
      script: 'வணக்கம்',
      subtext: 'Tamil',
      font: "'Noto Sans Tamil', 'Nirmala UI', 'Latha', sans-serif",
      fontSize: 115,
      yOffset: -6
    },
    {
      lang: 'te',
      name: 'తెలుగు',
      script: 'నమస్కారం',
      subtext: 'Telugu',
      font: "'Noto Sans Telugu', 'Nirmala UI', 'Gautami', sans-serif",
      fontSize: 118,
      yOffset: -6
    }
  ]

  public currentIndex: number = 0
  public activeChalkColor: string = '#FFFFFF'

  // State Machine: 'MOVE_TO_START' | 'WRITING' | 'HOLDING' | 'DISINTEGRATING' | 'WAITING_NEXT'
  public state: 'MOVE_TO_START' | 'WRITING' | 'HOLDING' | 'DISINTEGRATING' | 'WAITING_NEXT' = 'MOVE_TO_START'
  public stateTimer: number = 0
  public isAutoPlay: boolean = true

  // ULTRA-FAST SPEEDS per user request:
  public writeProgress: number = 0
  public writeDuration: number = 480
  public holdDuration: number = 850
  public disintegrateDuration: number = 420

  public chalk = {
    x: -100,
    y: -100,
    targetX: 0,
    targetY: 0,
    angle: -25,
    isDown: false,
    opacity: 1
  }

  private particles: Particle[] = []
  private dustSparks: Spark[] = []
  private trayDust: TrayDust[] = []

  private textBounds: {
    x: number
    y: number
    width: number
    height: number
    centerX: number
    centerY: number
    fontSize: number
  } | null = null

  public width: number = 0
  public height: number = 0
  public dpr: number = 1

  private lastTime: number = performance.now()
  private animId: number | null = null
  private isDestroyed: boolean = false
  public audio: ChalkAudioEngine

  constructor(container: HTMLElement) {
    this.container = container
    this.audio = new ChalkAudioEngine()

    const createSafeContext = (canvas: HTMLCanvasElement): CanvasRenderingContext2D => {
      const realCtx = canvas.getContext('2d')
      if (realCtx) return realCtx
      return new Proxy({} as CanvasRenderingContext2D, {
        get: (_target, prop) => {
          if (prop === 'measureText') return () => ({ width: 100 })
          if (prop === 'createLinearGradient' || prop === 'createRadialGradient') {
            return () => ({ addColorStop: () => {} })
          }
          if (prop === 'getImageData') {
            return () => ({ data: new Uint8ClampedArray(400) })
          }
          return () => {}
        }
      })
    }

    this.canvas = document.createElement('canvas')
    this.ctx = createSafeContext(this.canvas)
    this.container.appendChild(this.canvas)

    this.offscreen = document.createElement('canvas')
    this.offCtx = createSafeContext(this.offscreen)

    this.surfaceCanvas = document.createElement('canvas')
    this.surfaceCtx = createSafeContext(this.surfaceCanvas)

    this.dpr = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 1
    this.init()
  }

  private init(): void {
    this.resize()
    window.addEventListener('resize', this.handleResize)

    if (document.fonts) {
      document.fonts.ready.then(() => {
        if (this.isDestroyed) return
        this.createBoardTexture()
        this.prepareWriting(0)
      })
    } else {
      this.createBoardTexture()
      this.prepareWriting(0)
    }

    this.lastTime = performance.now()
    this.animId = requestAnimationFrame(this.animate)
  }

  private handleResize = (): void => {
    this.resize()
  }

  public resize(): void {
    const rect = this.container.getBoundingClientRect()
    this.width = Math.floor(rect.width) || window.innerWidth
    this.height = Math.floor(rect.height) || window.innerHeight

    this.canvas.width = Math.floor(this.width * this.dpr)
    this.canvas.height = Math.floor(this.height * this.dpr)
    this.canvas.style.width = `${this.width}px`
    this.canvas.style.height = `${this.height}px`

    this.offscreen.width = this.width
    this.offscreen.height = this.height

    this.surfaceCanvas.width = this.width
    this.surfaceCanvas.height = this.height

    this.createBoardTexture()
    if (this.greetings[this.currentIndex]) {
      this.renderTextOffscreen(this.greetings[this.currentIndex])
    }
  }

  private createBoardTexture(): void {
    const sCtx = this.surfaceCtx
    sCtx.clearRect(0, 0, this.width, this.height)

    // Faint horizontal guide lines
    sCtx.save()
    sCtx.strokeStyle = 'rgba(255, 255, 255, 0.022)'
    sCtx.lineWidth = 1
    const lineSpacing = 48
    const startY = this.height * 0.15
    for (let y = startY; y < this.height * 0.88; y += lineSpacing) {
      sCtx.beginPath()
      sCtx.moveTo(this.width * 0.05, y)
      sCtx.lineTo(this.width * 0.95, y)
      sCtx.stroke()
    }
    sCtx.restore()

    // Faint duster swipe curves
    sCtx.save()
    sCtx.strokeStyle = 'rgba(255, 255, 255, 0.018)'
    sCtx.lineWidth = 26
    sCtx.lineCap = 'round'
    for (let i = 0; i < 5; i++) {
      const y = this.height * (0.24 + i * 0.13)
      sCtx.beginPath()
      sCtx.moveTo(this.width * 0.08, y)
      sCtx.quadraticCurveTo(this.width * 0.5, y - 18, this.width * 0.92, y + 10)
      sCtx.stroke()
    }
    sCtx.restore()
  }

  public prepareWriting(index: number = 0): void {
    this.currentIndex = (index + this.greetings.length) % this.greetings.length
    const greeting = this.greetings[this.currentIndex]

    this.renderTextOffscreen(greeting)

    const startX = this.textBounds ? this.textBounds.x : this.width * 0.25
    const startY = this.textBounds ? this.textBounds.centerY : this.height * 0.5

    this.chalk.targetX = startX
    this.chalk.targetY = startY
    this.chalk.x = startX - 80
    this.chalk.y = startY - 60
    this.chalk.isDown = false
    this.chalk.opacity = 1

    this.state = 'MOVE_TO_START'
    this.stateTimer = 0
    this.writeProgress = 0
  }

  private renderTextOffscreen(greeting: GreetingItem): void {
    const off = this.offscreen
    const ctx = this.offCtx
    ctx.clearRect(0, 0, off.width, off.height)

    ctx.save()
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    const scale = Math.min(this.width / 1100, this.height / 650)
    const actualFontSize = Math.round(greeting.fontSize * Math.max(scale, 0.75))
    ctx.font = `700 ${actualFontSize}px ${greeting.font}`

    const centerX = this.width / 2
    const centerY = this.height / 2 + (greeting.yOffset || 0) * scale

    const metrics = ctx.measureText(greeting.script)
    const textWidth = Math.max(metrics.width, 100)
    const textHeight = actualFontSize * 1.25

    this.textBounds = {
      x: Math.max(0, centerX - textWidth / 2 - 20),
      y: Math.max(0, centerY - textHeight / 2),
      width: textWidth + 40,
      height: textHeight,
      centerX,
      centerY,
      fontSize: actualFontSize
    }

    // Chalk porous glow & core
    ctx.save()
    ctx.shadowColor = 'rgba(255, 255, 255, 0.6)'
    ctx.shadowBlur = 12
    ctx.fillStyle = this.activeChalkColor
    ctx.fillText(greeting.script, centerX, centerY)
    ctx.restore()

    ctx.save()
    ctx.fillStyle = this.activeChalkColor
    ctx.shadowColor = 'rgba(255, 255, 255, 0.4)'
    ctx.shadowBlur = 4
    ctx.fillText(greeting.script, centerX, centerY)

    ctx.fillStyle = 'rgba(255, 255, 255, 0.88)'
    ctx.fillText(greeting.script, centerX + 0.8, centerY - 0.6)
    ctx.fillText(greeting.script, centerX - 0.6, centerY + 0.6)
    ctx.restore()

    ctx.restore()
  }

  private startWritingGreeting(): void {
    this.state = 'WRITING'
    this.writeProgress = 0
    this.stateTimer = 0
    this.chalk.isDown = true
    this.audio.startWriting()
  }

  private finishWritingGreeting(): void {
    this.state = 'HOLDING'
    this.stateTimer = 0
    this.chalk.isDown = false
    this.audio.stopWriting()
    this.audio.playChalkTap(0.12)
  }

  public disintegrateIntoPowder(): void {
    this.audio.stopWriting()
    this.audio.playPowderFall()

    this.state = 'DISINTEGRATING'
    this.stateTimer = 0
    this.chalk.isDown = false

    const tempCanvas = document.createElement('canvas')
    tempCanvas.width = this.width
    tempCanvas.height = this.height
    const tempCtx = tempCanvas.getContext('2d')
    if (!tempCtx) return

    if (this.writeProgress > 0.05) {
      tempCtx.drawImage(this.offscreen, 0, 0)
    }

    const imgData = tempCtx.getImageData(0, 0, this.width, this.height)
    const data = imgData.data

    const step = this.width > 1000 ? 3 : 2
    const newParticles: Particle[] = []

    for (let y = 0; y < this.height - 40; y += step) {
      for (let x = 0; x < this.width; x += step) {
        const idx = (y * this.width + x) * 4
        const alpha = data[idx + 3]

        if (alpha > 40) {
          const r = data[idx]
          const g = data[idx + 1]
          const b = data[idx + 2]

          const angle = Math.random() * Math.PI * 2
          const popSpeed = 2.0 + Math.random() * 4.2
          const vx = Math.cos(angle) * popSpeed + (Math.random() - 0.5) * 3.0
          const vy = Math.sin(angle) * (popSpeed * 0.4) - (0.5 + Math.random() * 2.0)

          newParticles.push({
            x: x + (Math.random() - 0.5) * 2,
            y: y + (Math.random() - 0.5) * 2,
            vx,
            vy,
            gravity: 0.85 + Math.random() * 0.45,
            drag: 0.97,
            sway: Math.random() * Math.PI * 2,
            swaySpeed: 0.08 + Math.random() * 0.14,
            swayAmp: 1.0 + Math.random() * 1.8,
            alpha: (alpha / 255) * (0.85 + Math.random() * 0.15),
            fade: 0.007 + Math.random() * 0.008,
            size: Math.random() < 0.85 ? 1.4 + Math.random() * 2.2 : 3.5 + Math.random() * 2.5,
            color: `rgb(${r},${g},${b})`,
            settled: false,
            life: 0,
            maxLife: 140 + Math.random() * 60
          })
        }
      }
    }

    this.particles = this.particles.concat(newParticles)
    this.offCtx.clearRect(0, 0, this.width, this.height)
    this.writeProgress = 0
  }

  private animate = (now: number): void => {
    if (this.isDestroyed) return
    const dt = Math.min(now - this.lastTime, 60)
    this.lastTime = now

    this.update(dt)
    this.render()

    this.animId = requestAnimationFrame(this.animate)
  }

  private update(dt: number): void {
    this.stateTimer += dt

    // Particle Physics runs continuously
    const trayY = this.height - 30
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]
      p.life++

      if (p.settled) {
        p.alpha -= 0.004
        if (p.alpha <= 0 || p.life > p.maxLife) {
          this.particles.splice(i, 1)
        }
        continue
      }

      p.vx *= p.drag
      p.vy = (p.vy + p.gravity) * p.drag
      p.sway += p.swaySpeed
      const swayOffset = Math.sin(p.sway) * p.swayAmp

      p.x += p.vx + swayOffset * 0.25
      p.y += p.vy

      if (p.y >= trayY) {
        p.y = trayY + (Math.random() - 0.5) * 4
        p.settled = true
        p.vx = 0
        p.vy = 0

        if (this.trayDust.length < 350 && Math.random() < 0.25) {
          this.trayDust.push({
            x: p.x,
            y: p.y,
            alpha: 0.35 + Math.random() * 0.35,
            size: 1 + Math.random() * 2.5,
            color: p.color
          })
        }
      }

      p.alpha -= p.fade
      if (p.alpha <= 0 || p.life > p.maxLife) {
        this.particles.splice(i, 1)
      }
    }

    // State machine updates
    switch (this.state) {
      case 'MOVE_TO_START':
        this.chalk.x += (this.chalk.targetX - this.chalk.x) * 0.16
        this.chalk.y += (this.chalk.targetY - this.chalk.y) * 0.16
        if (this.stateTimer > 120) {
          this.startWritingGreeting()
        }
        break

      case 'WRITING':
        this.writeProgress += dt / this.writeDuration
        if (this.textBounds) {
          const curX = this.textBounds.x + this.textBounds.width * this.writeProgress
          const curY = this.textBounds.centerY + Math.sin(this.writeProgress * 28) * 14
          this.chalk.x = curX
          this.chalk.y = curY
          this.chalk.angle = -20 + Math.sin(this.writeProgress * 22) * 12

          if (Math.random() < 0.6) {
            this.dustSparks.push({
              x: curX + (Math.random() - 0.5) * 4,
              y: curY + (Math.random() - 0.5) * 4,
              vx: (Math.random() - 0.5) * 2,
              vy: 0.8 + Math.random() * 2,
              alpha: 0.8,
              size: 1 + Math.random() * 2,
              color: this.activeChalkColor
            })
          }
        }

        if (this.writeProgress >= 1.0) {
          this.writeProgress = 1.0
          this.finishWritingGreeting()
        }
        break

      case 'HOLDING': {
        const restX = this.width - 90
        const restY = this.height - 70
        this.chalk.x += (restX - this.chalk.x) * 0.08
        this.chalk.y += (restY - this.chalk.y) * 0.08

        if (this.isAutoPlay && this.stateTimer >= this.holdDuration) {
          this.disintegrateIntoPowder()
        }
        break
      }

      case 'DISINTEGRATING':
        if (this.stateTimer >= this.disintegrateDuration) {
          this.state = 'WAITING_NEXT'
          this.stateTimer = 0
        }
        break

      case 'WAITING_NEXT':
        if (this.isAutoPlay && this.stateTimer > 100) {
          this.prepareWriting(this.currentIndex + 1)
        }
        break
    }

    // Sparks
    for (let i = this.dustSparks.length - 1; i >= 0; i--) {
      const s = this.dustSparks[i]
      s.x += s.vx
      s.y += s.vy
      s.vy += 0.12
      s.alpha -= 0.04
      if (s.alpha <= 0) {
        this.dustSparks.splice(i, 1)
      }
    }
  }

  private render(): void {
    const ctx = this.ctx
    ctx.save()
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
    ctx.clearRect(0, 0, this.width, this.height)

    // 1. Surface texture
    ctx.drawImage(this.surfaceCanvas, 0, 0)

    // 2. Current Chalk Greeting
    if (this.writeProgress > 0 && this.state !== 'DISINTEGRATING') {
      ctx.save()
      if (this.textBounds) {
        const revealRight = this.textBounds.x + this.textBounds.width * this.writeProgress + 30
        ctx.beginPath()
        ctx.rect(0, 0, Math.min(this.width, revealRight), this.height)
        ctx.clip()
      }
      ctx.drawImage(this.offscreen, 0, 0)
      ctx.restore()
    }

    // 3. Falling Chalk Powder
    if (this.particles.length > 0) {
      ctx.save()
      for (let i = 0; i < this.particles.length; i++) {
        const p = this.particles[i]
        if (p.alpha <= 0.01) continue

        ctx.fillStyle = p.color
        ctx.globalAlpha = p.alpha
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.restore()
    }

    // 4. Settled Tray Dust
    if (this.trayDust.length > 0) {
      ctx.save()
      for (let i = 0; i < this.trayDust.length; i++) {
        const d = this.trayDust[i]
        ctx.fillStyle = d.color
        ctx.globalAlpha = d.alpha
        ctx.beginPath()
        ctx.arc(d.x, d.y, d.size, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.restore()
    }

    // 5. Sparks
    if (this.dustSparks.length > 0) {
      ctx.save()
      for (let i = 0; i < this.dustSparks.length; i++) {
        const s = this.dustSparks[i]
        ctx.fillStyle = s.color
        ctx.globalAlpha = s.alpha
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.restore()
    }

    // 6. Chalk Stick
    if (this.state === 'WRITING' || this.state === 'MOVE_TO_START' || this.state === 'HOLDING') {
      this.renderChalkStick(ctx, this.chalk.x, this.chalk.y, this.chalk.angle)
    }

    ctx.restore()
  }

  private renderChalkStick(ctx: CanvasRenderingContext2D, x: number, y: number, angleDeg: number): void {
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate((angleDeg * Math.PI) / 180)

    const len = 52
    const width = 12

    ctx.save()
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)'
    ctx.beginPath()
    ctx.roundRect(-width / 2 + 5, -len + 5, width, len, 3)
    ctx.fill()
    ctx.restore()

    const grad = ctx.createLinearGradient(-width / 2, 0, width / 2, 0)
    grad.addColorStop(0, '#D6D6D6')
    grad.addColorStop(0.35, this.activeChalkColor)
    grad.addColorStop(0.8, '#FFFFFF')
    grad.addColorStop(1, '#B0B0B0')

    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.roundRect(-width / 2, -len, width, len - 3, [3, 3, 1, 1])
    ctx.fill()

    ctx.fillStyle = '#FFFFFF'
    ctx.beginPath()
    ctx.ellipse(0, 0, width / 2, 3, 0, 0, Math.PI * 2)
    ctx.fill()

    ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)'
    ctx.lineWidth = 1
    ctx.strokeRect(-width / 2, -len + 16, width, 1)

    ctx.restore()
  }

  public destroy(): void {
    this.isDestroyed = true
    if (this.animId !== null) {
      cancelAnimationFrame(this.animId)
      this.animId = null
    }
    window.removeEventListener('resize', this.handleResize)
    this.audio.stopWriting()
  }
}
