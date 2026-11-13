/**
 * Спільні засоби ігрових сцен (Canvas 2D, без Vue).
 * Сцени отримують лише u, стан автомата і зворотний зв'язок рушія — без ключових точок.
 */

/** Стан автомата вправи (дублюється тут, щоб сцени не залежали від модулів моделі) */
export type ExerciseState = 'Waiting' | 'Moving' | 'Holding' | 'Returning' | 'Paused'

/** Вхід сцени на кожен кадр відмальовування */
export interface SceneInput {
  /** Інтерпольоване значення u (0..1) */
  u: number
  state: ExerciseState
  /** Пороги цілі та вихідного положення (частки діапазону) */
  thetaG: number
  thetaR: number
  /** Центр долоні в екранних координатах 0..1 (дзеркально); null — кисті немає */
  handPos: { x: number; y: number } | null
}

/** Загальний інтерфейс сцени */
export interface GameScene {
  update(dt: number, input: SceneInput): void
  draw(ctx: CanvasRenderingContext2D, width: number, height: number, input: SceneInput): void
}

/**
 * Експоненційне згладжування значення між кадрами камери, щоб частота відмальовування
 * не залежала від частоти обробки кадрів.
 */
export class Smoothed {
  constructor(
    public value = 0,
    /** Стала часу, с */
    private readonly tau = 0.08,
  ) {}

  step(target: number, dt: number): number {
    const k = 1 - Math.exp(-Math.max(0, dt) / this.tau)
    this.value += (target - this.value) * k
    return this.value
  }

  reset(v: number): void {
    this.value = v
  }
}

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k

/** Кольори сцен (контраст тексту за WCAG AA на світлому тлі) */
export const COLORS = {
  text: '#0f172a',
  muted: '#334155',
  accent: '#1d4ed8',
  success: '#15803d',
  danger: '#b91c1c',
  warning: '#b45309',
  highlight: '#f59e0b',
}

/** Текст з напівпрозорою підкладкою для читабельності поверх сцени */
export function label(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  opts: { size?: number; color?: string; align?: CanvasTextAlign; bg?: string } = {},
) {
  const size = opts.size ?? 24
  ctx.save()
  ctx.font = `600 ${size}px system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif`
  ctx.textAlign = opts.align ?? 'center'
  ctx.textBaseline = 'middle'
  if (opts.bg) {
    const w = ctx.measureText(text).width + size
    const x0 = ctx.textAlign === 'center' ? x - w / 2 : ctx.textAlign === 'right' ? x - w + size / 2 : x - size / 2
    ctx.fillStyle = opts.bg
    roundRect(ctx, x0, y - size * 0.8, w, size * 1.6, size * 0.4)
    ctx.fill()
  }
  ctx.fillStyle = opts.color ?? COLORS.text
  ctx.fillText(text, x, y)
  ctx.restore()
}

export function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.arcTo(x + w, y, x + w, y + h, rr)
  ctx.arcTo(x + w, y + h, x, y + h, rr)
  ctx.arcTo(x, y + h, x, y, rr)
  ctx.arcTo(x, y, x + w, y, rr)
  ctx.closePath()
}

/** Індикатор ступеня виконання руху: смуга з позначками θ_r і θ_g */
export function drawProgressBar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  input: Pick<SceneInput, 'u' | 'thetaG' | 'thetaR' | 'state'>,
) {
  ctx.save()
  ctx.fillStyle = 'rgba(15, 23, 42, 0.12)'
  roundRect(ctx, x, y, w, h, h / 2)
  ctx.fill()
  const reached = input.state === 'Holding' || input.state === 'Returning'
  ctx.fillStyle = reached ? COLORS.success : COLORS.accent
  roundRect(ctx, x, y, Math.max(h, w * clamp(input.u, 0, 1)), h, h / 2)
  ctx.fill()
  ctx.strokeStyle = COLORS.text
  ctx.lineWidth = 3
  const gx = x + w * input.thetaG
  ctx.beginPath()
  ctx.moveTo(gx, y - 6)
  ctx.lineTo(gx, y + h + 6)
  ctx.stroke()
  ctx.restore()
}
