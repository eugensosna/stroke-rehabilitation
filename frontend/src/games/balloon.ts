/**
 * «Повітряна куля» — розкриття і стискання кисті (табл. 2.1). u задає висоту кулі; перешкоди
 * з проміжками з'являються в заданому темпі (темп = бажана частота повторень, яку задає фахівець).
 * Проміжки чергуються: угорі (розкрити кисть) і внизу (стиснути кулак) — один цикл на повторення.
 */
import { clamp, COLORS, label, roundRect, type GameScene, type SceneInput } from './common'

interface Wall {
  /** Положення по x, частка ширини */
  x: number
  /** Межі проміжку в u: [uLow; uHigh] */
  uLow: number
  uHigh: number
  passed: boolean | null
}

/** Час проходу стіни через екран, с */
const CROSS_TIME = 5
const BALLOON_X = 0.25

export class BalloonScene implements GameScene {
  private walls: Wall[] = []
  private spawnIn = 1
  private high = true
  private passes = 0
  private bump = 0
  private time = 0
  /** Темп: одне повторення (розкрити + стиснути) за 1/frequency с */
  frequencyHz: number

  constructor(frequencyHz: number) {
    this.frequencyHz = clamp(frequencyHz, 0.05, 1.5)
  }

  /** u → висота кулі на полотні */
  private yOf(u: number, h: number) {
    return h * 0.12 + (1 - clamp(u, 0, 1)) * h * 0.72
  }

  update(dt: number, input: SceneInput) {
    this.time += dt
    if (input.state === 'Paused') return
    // дві стіни (вгорі і внизу) на одне повторення
    this.spawnIn -= dt
    if (this.spawnIn <= 0) {
      this.spawnIn = 1 / (2 * this.frequencyHz)
      const g = input.thetaG
      this.walls.push(
        this.high
          ? { x: 1.1, uLow: Math.max(0.35, g - 0.12), uHigh: 1.05, passed: null }
          : { x: 1.1, uLow: -0.05, uHigh: Math.min(0.6, input.thetaR + 0.2), passed: null },
      )
      this.high = !this.high
    }
    const speed = 1.2 / CROSS_TIME
    for (const wall of this.walls) {
      wall.x -= speed * dt
      if (wall.passed === null && wall.x <= BALLOON_X) {
        wall.passed = input.u >= wall.uLow && input.u <= wall.uHigh
        if (wall.passed) this.passes++
        else this.bump = 0.6
      }
    }
    this.walls = this.walls.filter((w) => w.x > -0.15)
    this.bump = Math.max(0, this.bump - dt)
  }

  draw(ctx: CanvasRenderingContext2D, w: number, h: number, input: SceneInput) {
    const sky = ctx.createLinearGradient(0, 0, 0, h)
    sky.addColorStop(0, '#bae6fd')
    sky.addColorStop(1, '#e0f2fe')
    ctx.fillStyle = sky
    ctx.fillRect(0, 0, w, h)
    // хмари
    ctx.fillStyle = 'rgba(255,255,255,0.85)'
    for (let i = 0; i < 4; i++) {
      const x = ((i * 0.31 - this.time * 0.02) % 1.2 + 1.2) % 1.2 - 0.1
      ctx.beginPath()
      ctx.ellipse(x * w, h * (0.2 + i * 0.17), 60, 22, 0, 0, Math.PI * 2)
      ctx.fill()
    }

    // стіни з проміжками
    const ww = Math.max(40, w * 0.06)
    for (const wall of this.walls) {
      const x = wall.x * w
      const top = this.yOf(wall.uHigh, h)
      const bottom = this.yOf(wall.uLow, h)
      ctx.fillStyle = wall.passed === false ? '#fca5a5' : wall.passed ? '#86efac' : '#64748b'
      roundRect(ctx, x - ww / 2, -10, ww, top + 10 - 30, 10)
      ctx.fill()
      roundRect(ctx, x - ww / 2, bottom + 30, ww, h - bottom, 10)
      ctx.fill()
    }

    // куля
    const bx = BALLOON_X * w + Math.sin(this.bump * 30) * this.bump * 12
    const by = this.yOf(input.u, h)
    const r = Math.min(w, h) * 0.07
    ctx.strokeStyle = '#475569'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(bx, by + r)
    ctx.quadraticCurveTo(bx - 10, by + r * 1.8, bx, by + r * 2.4)
    ctx.stroke()
    ctx.fillStyle = this.bump > 0 ? COLORS.warning : '#dc2626'
    ctx.beginPath()
    ctx.ellipse(bx, by, r * 0.85, r, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,0.5)'
    ctx.beginPath()
    ctx.ellipse(bx - r * 0.3, by - r * 0.35, r * 0.18, r * 0.3, -0.5, 0, Math.PI * 2)
    ctx.fill()

    const next = this.walls.find((x) => x.passed === null)
    const hint = !next ? 'Розкривайте і стискайте кисть' : next.uLow > 0.2 ? 'Розкрийте долоню — вгору!' : 'Стисніть кулак — вниз!'
    label(ctx, hint, w / 2, 40, { size: 26, bg: 'rgba(255,255,255,0.9)' })
    label(ctx, `Пролетіли: ${this.passes}`, w - 20, h - 30, { size: 22, align: 'right', bg: 'rgba(255,255,255,0.9)' })
  }
}
