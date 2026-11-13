/**
 * «Арканоїд» для вправи на рух кисті ліворуч і праворуч. Ракетку веде центр долоні (u — положення
 * на полі), над ракеткою напівпрозоро показано кисть пацієнта. Відбитий м'яч — успішне повторення,
 * пропущений — невдале (результат повідомляє вправі компонент гри).
 * Рівень складності: вища швидкість м'яча і вужча ракетка.
 */
import { clamp, COLORS, label, roundRect, Smoothed, type GameScene, type SceneInput } from './common'
import { drawHandOverlay } from './handOverlay'

/** Віртуальне поле; на полотні масштабується зі збереженням пропорцій */
export const FIELD_W = 800
export const FIELD_H = 500

const ROWS = 5
const COLS = 10
const BRICK_GAP = 6
const BRICK_TOP = 60
const BRICK_H = 22
const BRICK_W = (FIELD_W - BRICK_GAP * (COLS + 1)) / COLS
const PADDLE_Y = FIELD_H - 36
const PADDLE_H = 16
const BALL_R = 10
const ROW_COLORS = ['#f472b6', '#fb7185', '#fb923c', '#facc15', '#4ade80']
/** Пауза перед автоматичним запуском м'яча, с (кнопки пацієнтові не потрібні) */
const LAUNCH_DELAY = 1.2

interface Brick {
  x: number
  y: number
  alive: boolean
  color: string
}

export interface ArkanoidCallbacks {
  /** М'яч відбито ракеткою */
  onHit(): void
  /** М'яч пропущено */
  onMiss(): void
}

/** Ширина ракетки на рівні L (віртуальні пікселі) */
export const paddleWidth = (level: number) => clamp(170 - 9 * (level - 1), 90, 170)
/** Швидкість м'яча на рівні L (віртуальні пікселі за секунду) */
export const ballSpeed = (level: number) => clamp(260 + 22 * (level - 1), 260, 480)

export class ArkanoidScene implements GameScene {
  private bricks: Brick[] = []
  private level = 1
  private active = false
  private readonly paddleX = new Smoothed(FIELD_W / 2, 0.06)
  private ball = { x: FIELD_W / 2, y: PADDLE_Y - BALL_R, vx: 0, vy: 0, stuck: true, wait: LAUNCH_DELAY }
  private hand: { x: number; y: number }[] | null = null
  private flash: { ok: boolean; t: number } | null = null
  private walls = 0
  private score = 0
  private message = 'Рухайте кисть — ракетка повторює рух долоні'

  constructor(
    private readonly callbacks: ArkanoidCallbacks,
    private readonly rng: () => number = Math.random,
  ) {
    this.buildWall()
  }

  setLevel(level: number) {
    this.level = level
  }

  /** Гра йде лише під час серії (не на екранах початку і результату) */
  setActive(active: boolean) {
    if (active && !this.active) this.stickBall()
    this.active = active
  }

  setHand(points: { x: number; y: number }[] | null) {
    this.hand = points
  }

  private buildWall() {
    this.bricks = []
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        this.bricks.push({
          x: BRICK_GAP + c * (BRICK_W + BRICK_GAP),
          y: BRICK_TOP + r * (BRICK_H + BRICK_GAP),
          alive: true,
          color: ROW_COLORS[r % ROW_COLORS.length],
        })
      }
    }
  }

  private stickBall() {
    this.ball = { x: this.paddleX.value, y: PADDLE_Y - BALL_R, vx: 0, vy: 0, stuck: true, wait: LAUNCH_DELAY }
  }

  private launch() {
    const a = -Math.PI / 2 + (this.rng() - 0.5) * 0.7
    const v = ballSpeed(this.level)
    this.ball.vx = Math.cos(a) * v
    this.ball.vy = Math.sin(a) * v
    this.ball.stuck = false
  }

  update(dt: number, input: SceneInput) {
    const pw = paddleWidth(this.level)
    // u — положення долоні в робочому діапазоні → центр ракетки
    this.paddleX.step(pw / 2 + clamp(input.u, 0, 1) * (FIELD_W - pw), dt)
    if (this.flash) {
      this.flash.t -= dt
      if (this.flash.t <= 0) this.flash = null
    }
    if (!this.active || input.state === 'Paused' || !input.handPos) {
      if (this.ball.stuck) this.ball.x = this.paddleX.value
      return
    }

    const b = this.ball
    if (b.stuck) {
      b.x = this.paddleX.value
      b.y = PADDLE_Y - BALL_R
      b.wait -= dt
      if (b.wait <= 0) this.launch()
      return
    }

    // кілька підкроків, щоб швидкий м'яч не проскакував цеглинки
    const steps = Math.max(1, Math.ceil((Math.hypot(b.vx, b.vy) * dt) / 8))
    const h = dt / steps
    for (let i = 0; i < steps; i++) {
      if (this.stepBall(h, pw)) return
    }
  }

  /** true — м'яч пропущено (подальші підкроки не потрібні) */
  private stepBall(dt: number, pw: number): boolean {
    const b = this.ball
    b.x += b.vx * dt
    b.y += b.vy * dt
    if (b.x < BALL_R) {
      b.x = BALL_R
      b.vx = Math.abs(b.vx)
    }
    if (b.x > FIELD_W - BALL_R) {
      b.x = FIELD_W - BALL_R
      b.vx = -Math.abs(b.vx)
    }
    if (b.y < BALL_R) {
      b.y = BALL_R
      b.vy = Math.abs(b.vy)
    }

    // ракетка
    const px = this.paddleX.value - pw / 2
    if (b.vy > 0 && b.y + BALL_R >= PADDLE_Y && b.y - BALL_R <= PADDLE_Y + PADDLE_H && b.x >= px - BALL_R && b.x <= px + pw + BALL_R) {
      b.y = PADDLE_Y - BALL_R
      const hit = clamp((b.x - this.paddleX.value) / (pw / 2), -1, 1)
      const a = -Math.PI / 2 + hit * (Math.PI / 3)
      const v = ballSpeed(this.level)
      b.vx = Math.cos(a) * v
      b.vy = Math.sin(a) * v
      this.flash = { ok: true, t: 0.35 }
      this.message = 'Відбито!'
      this.callbacks.onHit()
    }

    // цеглинки
    for (const br of this.bricks) {
      if (!br.alive) continue
      if (b.x + BALL_R > br.x && b.x - BALL_R < br.x + BRICK_W && b.y + BALL_R > br.y && b.y - BALL_R < br.y + BRICK_H) {
        br.alive = false
        this.score += 10
        const ox = Math.min(b.x + BALL_R - br.x, br.x + BRICK_W - (b.x - BALL_R))
        const oy = Math.min(b.y + BALL_R - br.y, br.y + BRICK_H - (b.y - BALL_R))
        if (ox < oy) b.vx = -b.vx
        else b.vy = -b.vy
        break
      }
    }
    if (this.bricks.every((br) => !br.alive)) {
      this.walls++
      this.message = 'Стіну розбито! Нова стіна'
      this.buildWall()
      this.stickBall()
      return true
    }

    // пропущено
    if (b.y - BALL_R > FIELD_H) {
      this.flash = { ok: false, t: 0.6 }
      this.message = "М'яч пропущено. Ведіть ракетку під м'яч"
      this.callbacks.onMiss()
      this.stickBall()
      return true
    }
    return false
  }

  draw(ctx: CanvasRenderingContext2D, w: number, h: number, input: SceneInput) {
    ctx.fillStyle = '#0b1026'
    ctx.fillRect(0, 0, w, h)
    // поле вписано в полотно
    const k = Math.min(w / FIELD_W, h / FIELD_H)
    const ox = (w - FIELD_W * k) / 2
    const oy = (h - FIELD_H * k) / 2
    ctx.save()
    ctx.translate(ox, oy)
    ctx.scale(k, k)

    ctx.fillStyle = '#111836'
    ctx.fillRect(0, 0, FIELD_W, FIELD_H)
    if (this.flash && !this.flash.ok) {
      ctx.fillStyle = `rgba(185,28,28,${0.35 * this.flash.t})`
      ctx.fillRect(0, 0, FIELD_W, FIELD_H)
    }

    for (const br of this.bricks) {
      if (!br.alive) continue
      ctx.fillStyle = br.color
      roundRect(ctx, br.x, br.y, BRICK_W, BRICK_H, 5)
      ctx.fill()
    }

    this.drawHand(ctx)

    // ракетка
    const pw = paddleWidth(this.level)
    const px = this.paddleX.value - pw / 2
    ctx.fillStyle = this.flash?.ok ? COLORS.success : '#38bdf8'
    roundRect(ctx, px, PADDLE_Y, pw, PADDLE_H, PADDLE_H / 2)
    ctx.fill()

    // м'яч
    ctx.fillStyle = '#f8fafc'
    ctx.beginPath()
    ctx.arc(this.ball.x, this.ball.y, BALL_R, 0, Math.PI * 2)
    ctx.fill()

    label(ctx, `Стін розбито: ${this.walls}   Цеглинок: ${this.score / 10}`, 12, 24, {
      size: 18,
      align: 'left',
      color: '#e2e8f0',
    })
    const text = !input.handPos
      ? 'Покладіть кисть перед камерою'
      : this.ball.stuck && this.active
        ? "Приготуйтеся — м'яч зараз полетить"
        : this.message
    label(ctx, text, FIELD_W / 2, BRICK_TOP + ROWS * (BRICK_H + BRICK_GAP) + 34, {
      size: 22,
      color: COLORS.text,
      bg: 'rgba(255,255,255,0.88)',
    })
    ctx.restore()
  }

  /** Кисть пацієнта над ракеткою (центр долоні — над центром ракетки) */
  private drawHand(ctx: CanvasRenderingContext2D) {
    drawHandOverlay(ctx, this.hand, this.paddleX.value, PADDLE_Y - 110)
  }
}
