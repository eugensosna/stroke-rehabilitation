/**
 * «Піаніно» — ізольовані рухи пальців (табл. 2.1). Заданим пальцем натиснути клавішу, не зачіпаючи
 * сусідніх; правильні натискання відтворюють мелодію. Якщо зрушив інший палець — показати, який саме.
 */
import { clamp, COLORS, label, roundRect, type GameScene, type SceneInput } from './common'

export type PianoFinger = 1 | 2 | 3 | 4 | 5

const NAMES: Record<PianoFinger, string> = {
  1: 'Великий',
  2: 'Вказівний',
  3: 'Середній',
  4: 'Безіменний',
  5: 'Мізинець',
}
const NOTE_NAMES: Record<PianoFinger, string> = { 1: 'до', 2: 'ре', 3: 'мі', 4: 'фа', 5: 'соль' }
/** Частоти нот до–соль першої октави, Гц */
export const NOTE_FREQ: Record<PianoFinger, number> = { 1: 261.63, 2: 293.66, 3: 329.63, 4: 349.23, 5: 392.0 }

/** Проста мелодія з п'яти нот (власна, гама вгору-вниз з повтором) */
export const MELODY: PianoFinger[] = [1, 2, 3, 1, 3, 4, 5, 3, 2, 4, 3, 2, 1]

export class PianoScene implements GameScene {
  private pos = 0
  private moved: PianoFinger[] = []
  private movedTimer = 0
  private pressed: { f: PianoFinger; t: number } | null = null
  private songs = 0

  constructor(
    private readonly fingers: PianoFinger[] = [1, 2, 3, 4, 5],
    private readonly melody: PianoFinger[] = MELODY.filter((f) => fingers.includes(f)),
  ) {}

  get target(): PianoFinger {
    return this.melody[this.pos % this.melody.length]
  }

  /** Пальці, що зрушили разом із заданим (з рушія) */
  setMoved(fingers: number[]) {
    if (fingers.length === 0) return
    this.moved = fingers.filter((f): f is PianoFinger => f >= 1 && f <= 5)
    this.movedTimer = 0.8
  }

  /** Правильне натискання: нота, наступний палець */
  onSuccess(): PianoFinger {
    const f = this.target
    this.pressed = { f, t: 0.4 }
    this.pos++
    if (this.pos % this.melody.length === 0) this.songs++
    return f
  }

  update(dt: number) {
    this.movedTimer = Math.max(0, this.movedTimer - dt)
    if (this.movedTimer === 0) this.moved = []
    if (this.pressed) {
      this.pressed.t -= dt
      if (this.pressed.t <= 0) this.pressed = null
    }
  }

  draw(ctx: CanvasRenderingContext2D, w: number, h: number, input: SceneInput) {
    ctx.fillStyle = '#fef3c7'
    ctx.fillRect(0, 0, w, h)

    // мелодія: ноти, які вже зіграно, і наступні
    const show = 9
    const noteW = Math.min(70, (w - 40) / show)
    const base = this.pos % this.melody.length
    for (let i = 0; i < show; i++) {
      const idx = base + i
      if (idx >= this.melody.length) break
      const f = this.melody[idx]
      const x = w / 2 - (show * noteW) / 2 + i * noteW + noteW / 2
      const y = h * 0.16 - (f - 3) * 10
      ctx.fillStyle = i === 0 ? COLORS.highlight : '#1e293b'
      ctx.beginPath()
      ctx.ellipse(x, y, 16, 12, -0.3, 0, Math.PI * 2)
      ctx.fill()
      if (i === 0) label(ctx, NOTE_NAMES[f], x, y + 34, { size: 22 })
    }

    // клавіші
    const n = this.fingers.length
    const kw = Math.min(150, (w * 0.86) / n)
    const kh = h * 0.48
    const x0 = (w - kw * n) / 2
    const y0 = h * 0.36
    this.fingers.forEach((f, i) => {
      const x = x0 + i * kw
      const isTarget = f === this.target
      const isMoved = this.moved.includes(f)
      const isPressed = this.pressed?.f === f
      const depth = isTarget ? clamp(input.u, 0, 1) * 18 : isPressed ? 18 : 0
      ctx.fillStyle = isMoved ? '#fecaca' : isPressed ? '#bbf7d0' : isTarget ? '#fde68a' : '#ffffff'
      ctx.strokeStyle = isMoved ? COLORS.danger : '#334155'
      ctx.lineWidth = isMoved || isTarget ? 5 : 2
      roundRect(ctx, x + 4, y0 + depth, kw - 8, kh, 12)
      ctx.fill()
      ctx.stroke()
      label(ctx, NAMES[f], x + kw / 2, y0 + kh - 30 + depth, { size: Math.min(22, kw / 6) })
      label(ctx, NOTE_NAMES[f], x + kw / 2, y0 + 40 + depth, { size: 24, color: COLORS.muted })
    })

    const msg =
      this.moved.length > 0
        ? `Зрушив ${this.moved.map((f) => NAMES[f].toLowerCase()).join(', ')}. Тримайте інші пальці нерухомо`
        : `Зігніть ${NAMES[this.target].toLowerCase()}${this.target === 5 ? '' : ' палець'}`
    label(ctx, msg, w / 2, h * 0.29, {
      size: 26,
      color: this.moved.length > 0 ? COLORS.danger : COLORS.text,
      bg: 'rgba(255,255,255,0.92)',
    })
    label(ctx, `Зіграно мелодій: ${this.songs}`, 20, h - 26, { size: 22, align: 'left' })
  }
}
