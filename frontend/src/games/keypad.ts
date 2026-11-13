/**
 * «Кодовий замок» — вказування прямим пальцем. Угорі — випадковий чотиризначний код, нижче —
 * цифрова клавіатура. Кінчик прямого пальця (за координатами з камери) водить макет пальця над
 * клавіатурою; клавіша під пальцем трохи збільшується. Натискання — наближення кисті до камери
 * на 20 % відстані (рушій вправи); правильні цифри по черзі відкривають замок.
 */
import type { PointerJudge } from '@/exercises/engine'
import { clamp, COLORS, label, roundRect, Smoothed, type GameScene, type SceneInput } from './common'

/** Розкладка клавіатури (3 × 4), null — порожня комірка */
export const KEYPAD_LAYOUT: (string | null)[][] = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  [null, '0', null],
]
const COLS = 3
const ROWS = KEYPAD_LAYOUT.length
/** Частка комірки, яку займає клавіша (решта — проміжок, що не натискається) */
const KEY_FILL = 0.84

const FINGER_LABELS: Record<number, string> = { 2: 'Вказівний', 3: 'Середній', 4: 'Безіменний', 5: 'Мізинець' }

/** Випадковий чотиризначний код (перша цифра не нуль) */
export function randomCode(rng: () => number = Math.random, length = 4): string {
  let code = String(1 + Math.floor(rng() * 9))
  while (code.length < length) code += String(Math.floor(rng() * 10))
  return code
}

/**
 * Робоча зона камери, що відповідає клавіатурі (екранні частки 0..1, дзеркально).
 * Чим вищий рівень, тим більша зона — тим ширше треба водити кистю.
 */
export function activeZone(level: number): { x0: number; y0: number; w: number; h: number } {
  const w = clamp(0.32 + 0.04 * (level - 1), 0.32, 0.7)
  const h = clamp(w * 1.15, 0.36, 0.8)
  const cx = 0.5
  const cy = 0.45
  return { x0: cx - w / 2, y0: cy - h / 2, w, h }
}

/** Координати камери → нормовані координати клавіатури (0..1 по ширині й висоті) */
export function toKeypad(x: number, y: number, level: number): { kx: number; ky: number } {
  const z = activeZone(level)
  return { kx: (x - z.x0) / z.w, ky: (y - z.y0) / z.h }
}

/** Клавіша в нормованих координатах клавіатури (null — поза клавішами) */
export function keyAt(kx: number, ky: number): string | null {
  if (kx < 0 || kx >= 1 || ky < 0 || ky >= 1) return null
  const c = Math.floor(kx * COLS)
  const r = Math.floor(ky * ROWS)
  // проміжки між клавішами не натискаються
  const fx = kx * COLS - c
  const fy = ky * ROWS - r
  const m = (1 - KEY_FILL) / 2
  if (fx < m || fx > 1 - m || fy < m || fy > 1 - m) return null
  return KEYPAD_LAYOUT[r][c]
}

export interface KeypadPointer {
  finger: number
  x: number
  y: number
  locked: string | null
}

export class KeypadScene implements GameScene, PointerJudge {
  private code: string
  private pos = 0
  private level = 1
  private pointer: KeypadPointer | null = null
  private readonly cx = new Smoothed(0.5, 0.06)
  private readonly cy = new Smoothed(0.5, 0.06)
  private flash: { key: string; ok: boolean; t: number } | null = null
  private hoverGrow = new Map<string, Smoothed>()
  private shake = 0
  private openT = 0
  private opened = 0
  private message: string

  constructor(private readonly rng: () => number = Math.random) {
    this.code = randomCode(rng)
    this.message = this.prompt()
  }

  /** Цифра, яку треба натиснути зараз */
  get expected(): string {
    return this.code[Math.min(this.pos, this.code.length - 1)]
  }

  get currentCode(): string {
    return this.code
  }

  private prompt() {
    return `Наведіть палець на цифру ${this.expected} і наблизьте кисть до камери`
  }

  setLevel(level: number) {
    this.level = level
  }

  setPointer(p: KeypadPointer | null) {
    if (p && !this.pointer) {
      // перша поява — без «підльоту» курсора
      const k = toKeypad(p.x, p.y, this.level)
      this.cx.reset(k.kx)
      this.cy.reset(k.ky)
    }
    this.pointer = p
  }

  // PointerJudge — для рушія вправи
  hitTest(x: number, y: number): string | null {
    const { kx, ky } = toKeypad(x, y, this.level)
    return keyAt(kx, ky)
  }

  isCorrect(key: string): boolean {
    return this.openT === 0 && this.pos < this.code.length && key === this.expected
  }

  /** Правильну цифру натиснуто */
  onSuccess(key: string | null) {
    if (key) this.flash = { key, ok: true, t: 0.6 }
    this.pos++
    if (this.pos >= this.code.length) {
      this.opened++
      this.openT = 1.6
      this.message = 'Замок відкрито!'
      return
    }
    this.message = `Добре! Тепер цифра ${this.expected}`
  }

  /** Натиснуто не ту цифру */
  onFail(key: string | null) {
    this.shake = 0.5
    if (key) this.flash = { key, ok: false, t: 0.8 }
    this.message = key ? `Це ${key}. Потрібна цифра ${this.expected}` : `Спробуйте ще раз: цифра ${this.expected}`
  }

  update(dt: number) {
    if (this.pointer) {
      const k = toKeypad(this.pointer.x, this.pointer.y, this.level)
      this.cx.step(k.kx, dt)
      this.cy.step(k.ky, dt)
    }
    if (this.flash) {
      this.flash.t -= dt
      if (this.flash.t <= 0) this.flash = null
    }
    this.shake = Math.max(0, this.shake - dt)
    if (this.openT > 0) {
      this.openT = Math.max(0, this.openT - dt)
      if (this.openT === 0) {
        this.code = randomCode(this.rng)
        this.pos = 0
        this.message = `Новий код. ${this.prompt()}`
      }
    }
    // плавне збільшення клавіші під пальцем
    const hover = this.hoverKey()
    for (const row of KEYPAD_LAYOUT) {
      for (const key of row) {
        if (!key) continue
        let s = this.hoverGrow.get(key)
        if (!s) this.hoverGrow.set(key, (s = new Smoothed(0, 0.08)))
        s.step(key === hover ? 1 : 0, dt)
      }
    }
  }

  private hoverKey(): string | null {
    return this.pointer ? keyAt(this.cx.value, this.cy.value) : null
  }

  draw(ctx: CanvasRenderingContext2D, w: number, h: number, input: SceneInput) {
    ctx.fillStyle = '#eef2f7'
    ctx.fillRect(0, 0, w, h)

    // --- код угорі
    const codeCell = Math.min(78, w * 0.08)
    const gap = 12
    const codeW = codeCell * 4 + gap * 3
    const sx = w / 2 - codeW / 2 + Math.sin(this.shake * 40) * this.shake * 18
    const codeY = h * 0.04
    for (let i = 0; i < this.code.length; i++) {
      const x = sx + i * (codeCell + gap)
      const done = i < this.pos || this.openT > 0
      ctx.fillStyle = done ? COLORS.success : i === this.pos ? '#fde68a' : '#ffffff'
      roundRect(ctx, x, codeY, codeCell, codeCell * 1.15, 12)
      ctx.fill()
      ctx.lineWidth = i === this.pos && !done ? 4 : 2
      ctx.strokeStyle = i === this.pos && !done ? COLORS.highlight : '#94a3b8'
      ctx.stroke()
      label(ctx, this.code[i], x + codeCell / 2, codeY + codeCell * 0.58, {
        size: codeCell * 0.62,
        color: done ? '#fff' : COLORS.text,
      })
    }
    // замок праворуч від коду
    this.drawLock(ctx, sx + codeW + codeCell * 0.9, codeY + codeCell * 0.6, codeCell * 0.42)
    label(ctx, `Відкрито замків: ${this.opened}`, w - 16, h - 22, { size: 20, align: 'right', color: COLORS.muted })

    const msgY = codeY + codeCell * 1.15 + 30
    label(ctx, this.message, w / 2, msgY, {
      size: Math.min(26, w * 0.026),
      color: this.flash && !this.flash.ok ? COLORS.danger : COLORS.text,
      bg: 'rgba(255,255,255,0.9)',
    })

    // --- клавіатура
    const top = msgY + 30
    const kh = Math.max(120, h - top - 16)
    const kw = Math.min(w * 0.6, kh * 0.78)
    const kx0 = w / 2 - kw / 2
    const cellW = kw / COLS
    const cellH = kh / ROWS
    ctx.fillStyle = '#cbd5e1'
    roundRect(ctx, kx0 - 10, top - 10, kw + 20, kh + 20, 22)
    ctx.fill()

    const locked = this.pointer?.locked ?? null
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const key = KEYPAD_LAYOUT[r][c]
        if (!key) continue
        const grow = this.hoverGrow.get(key)?.value ?? 0
        const pressing = key === locked ? clamp(input.u, 0, 1) : 0
        // «об'єм» клавіші під пальцем: трохи більша і вища; під час натискання — вдавлюється
        const scale = 1 + 0.1 * grow - 0.05 * pressing
        const bw = cellW * KEY_FILL * scale
        const bh = cellH * KEY_FILL * scale
        const bx = kx0 + (c + 0.5) * cellW - bw / 2
        const by = top + (r + 0.5) * cellH - bh / 2
        const lift = 6 * grow * (1 - pressing)
        // тінь
        ctx.fillStyle = `rgba(15,23,42,${0.18 + 0.15 * grow})`
        roundRect(ctx, bx + 2, by + 4 + lift * 0.6, bw, bh, 16)
        ctx.fill()
        const fl = this.flash?.key === key ? this.flash : null
        ctx.fillStyle = fl ? (fl.ok ? COLORS.success : COLORS.danger) : grow > 0.5 ? '#ffffff' : '#f8fafc'
        roundRect(ctx, bx, by - lift, bw, bh, 16)
        ctx.fill()
        ctx.lineWidth = key === locked ? 5 : 2
        ctx.strokeStyle = key === locked ? COLORS.accent : grow > 0.5 ? COLORS.highlight : '#94a3b8'
        ctx.stroke()
        // заповнення натискання
        if (pressing > 0) {
          ctx.fillStyle = 'rgba(29,78,216,0.18)'
          roundRect(ctx, bx, by - lift + bh * (1 - pressing), bw, bh * pressing, 16)
          ctx.fill()
        }
        label(ctx, key, bx + bw / 2, by - lift + bh / 2, { size: Math.min(bw, bh) * 0.5, color: fl ? '#fff' : COLORS.text })
      }
    }

    // --- макет пальця над клавіатурою
    if (this.pointer) {
      const px = kx0 + clamp(this.cx.value, -0.08, 1.08) * kw
      const py = top + clamp(this.cy.value, -0.08, 1.08) * kh
      this.drawFinger(ctx, px, py, Math.min(cellW, cellH), clamp(input.u, 0, 1), this.pointer.finger)
    } else {
      label(ctx, 'Випряміть один палець і наведіть його на клавіатуру', w / 2, top + kh / 2, {
        size: Math.min(24, w * 0.024),
        bg: 'rgba(255,255,255,0.92)',
      })
    }
  }

  /** Стилізований прямий палець: кінчик у точці (x, y), тягнеться донизу; ближче до камери — більший */
  private drawFinger(ctx: CanvasRenderingContext2D, x: number, y: number, cell: number, press: number, finger: number) {
    const s = cell * (0.42 + 0.08 * press)
    const len = s * 3.4
    ctx.save()
    // тінь на клавіатурі: що ближче до «натискання», то ближче тінь до пальця
    ctx.fillStyle = 'rgba(15,23,42,0.18)'
    const off = s * 0.5 * (1 - press)
    roundRect(ctx, x - s / 2 + off, y - s * 0.1 + off, s, len, s / 2)
    ctx.fill()
    // палець
    ctx.globalAlpha = 0.92
    const grad = ctx.createLinearGradient(x - s / 2, 0, x + s / 2, 0)
    grad.addColorStop(0, '#f2b48a')
    grad.addColorStop(0.5, '#fcd9b6')
    grad.addColorStop(1, '#eba57b')
    ctx.fillStyle = grad
    roundRect(ctx, x - s / 2, y - s * 0.5, s, len, s / 2)
    ctx.fill()
    ctx.strokeStyle = '#b97a55'
    ctx.lineWidth = 2
    ctx.stroke()
    // ніготь
    ctx.fillStyle = '#fde8dc'
    roundRect(ctx, x - s * 0.3, y - s * 0.35, s * 0.6, s * 0.7, s * 0.28)
    ctx.fill()
    // згини суглобів
    ctx.strokeStyle = 'rgba(150,90,60,0.55)'
    for (const k of [1.25, 2.3]) {
      ctx.beginPath()
      ctx.moveTo(x - s * 0.3, y + s * k)
      ctx.lineTo(x + s * 0.3, y + s * k)
      ctx.stroke()
    }
    ctx.globalAlpha = 1
    // точка дотику
    ctx.strokeStyle = COLORS.accent
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.arc(x, y - s * 0.5, s * 0.22 + (1 - press) * s * 0.35, 0, Math.PI * 2)
    ctx.stroke()
    ctx.restore()
    label(ctx, FINGER_LABELS[finger] ?? '', x, y + len - s * 0.2, { size: 16, color: COLORS.muted, bg: 'rgba(255,255,255,0.85)' })
  }

  private drawLock(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number) {
    const open = this.openT > 0 ? 1 : 0
    ctx.save()
    ctx.lineWidth = s * 0.28
    ctx.strokeStyle = '#475569'
    ctx.beginPath()
    ctx.arc(cx, cy - s * 0.5 - open * s * 0.45, s * 0.55, Math.PI, 0)
    ctx.stroke()
    ctx.fillStyle = open ? COLORS.success : '#f59e0b'
    roundRect(ctx, cx - s * 0.85, cy - s * 0.5, s * 1.7, s * 1.4, 8)
    ctx.fill()
    ctx.restore()
  }
}
