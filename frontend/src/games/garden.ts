/**
 * «Город» — щипковий захват (табл. 2.1). Зближення великого і вказівного пальців «бере» насінину;
 * утримуючи захват, пацієнт переносить її до грядки. Положення — центр кисті в кадрі, захват — u.
 */
import { clamp, COLORS, label, lerp, roundRect, Smoothed, type GameScene, type SceneInput } from './common'

type SeedState = 'none' | 'held' | 'ready'

interface Bed {
  x: number
  planted: number
  grow: number
}

const BED_COUNT = 4
const BAG = { x: 0.12, y: 0.72 }

export class GardenScene implements GameScene {
  private seed: SeedState = 'none'
  private readonly beds: Bed[] = Array.from({ length: BED_COUNT }, (_, i) => ({
    x: 0.42 + (i * 0.5) / (BED_COUNT - 1),
    planted: 0,
    grow: 0,
  }))
  private readonly px = new Smoothed(0.5, 0.12)
  private readonly py = new Smoothed(0.5, 0.12)
  private message = 'Зведіть пальці над мішечком, щоб узяти насінину'
  private flash = 0
  private planted = 0
  private w = 1
  private h = 1

  /** Ціль досягнуто — насінина в пальцях */
  onGoalReached() {
    if (this.seed === 'none') {
      this.seed = 'held'
      this.message = 'Тримайте пальці зведеними'
    }
  }

  /** Повторення зараховано — насінину можна нести */
  onSuccess() {
    if (this.seed !== 'none') {
      this.seed = 'ready'
      this.message = 'Перенесіть насінину до грядки і розведіть пальці'
    }
  }

  onFail() {
    this.seed = 'none'
    this.message = 'Насінина випала. Спробуйте ще раз'
  }

  /** Повторення завершено (пальці розведено) — посадити, якщо над грядкою */
  onRepetitionEnd() {
    if (this.seed === 'ready') {
      const bed = this.bedUnderCursor() ?? this.nearestBed()
      bed.planted++
      bed.grow = 0
      this.planted++
      this.flash = 1
      this.message = 'Посаджено! Беріть наступну насінину'
    } else if (this.seed === 'held') {
      this.message = 'Тримайте захват довше'
    }
    this.seed = 'none'
  }

  onPaused() {
    this.seed = 'none'
  }

  private cursor() {
    return { x: this.px.value * this.w, y: this.py.value * this.h }
  }

  private bedUnderCursor(): Bed | null {
    const c = this.cursor()
    const bw = this.w * 0.14
    return this.beds.find((b) => Math.abs(b.x * this.w - c.x) < bw * 0.75 && c.y > this.h * 0.55) ?? null
  }

  private nearestBed(): Bed {
    const cx = this.px.value
    return this.beds.reduce((best, b) => (Math.abs(b.x - cx) < Math.abs(best.x - cx) ? b : best))
  }

  update(dt: number, input: SceneInput) {
    if (input.handPos) {
      this.px.step(clamp(input.handPos.x, 0.03, 0.97), dt)
      // верх кадру — небо, низ — грядки: вертикальний діапазон кисті розтягнуто
      this.py.step(clamp(lerp(0.15, 0.95, (input.handPos.y - 0.25) / 0.6), 0.1, 0.95), dt)
    }
    for (const b of this.beds) b.grow = Math.min(1, b.grow + dt * 0.8)
    this.flash = Math.max(0, this.flash - dt * 1.5)
  }

  draw(ctx: CanvasRenderingContext2D, w: number, h: number, input: SceneInput) {
    this.w = w
    this.h = h
    // небо і земля
    const sky = ctx.createLinearGradient(0, 0, 0, h)
    sky.addColorStop(0, '#dbeafe')
    sky.addColorStop(0.55, '#f0f9ff')
    sky.addColorStop(0.56, '#a16207')
    sky.addColorStop(1, '#713f12')
    ctx.fillStyle = sky
    ctx.fillRect(0, 0, w, h)

    // мішечок з насінням
    const bx = BAG.x * w
    const by = BAG.y * h
    ctx.fillStyle = '#d6a76a'
    roundRect(ctx, bx - w * 0.06, by - h * 0.08, w * 0.12, h * 0.16, 18)
    ctx.fill()
    ctx.fillStyle = '#7c2d12'
    for (let i = 0; i < 5; i++) {
      ctx.beginPath()
      ctx.ellipse(bx - 20 + i * 10, by - h * 0.08, 5, 8, 0.4, 0, Math.PI * 2)
      ctx.fill()
    }
    label(ctx, 'Насіння', bx, by + h * 0.12, { size: 22, color: '#fff' })

    // грядки
    const hover = this.seed === 'ready' ? this.bedUnderCursor() : null
    for (const b of this.beds) {
      const x = b.x * w
      const y = h * 0.8
      const bw = w * 0.14
      ctx.fillStyle = b === hover ? '#65a30d' : '#4d2c0c'
      roundRect(ctx, x - bw / 2, y - 18, bw, 36, 14)
      ctx.fill()
      for (let i = 0; i < b.planted; i++) {
        const sx = x - bw / 2 + ((i % 4) + 0.5) * (bw / 4)
        const size = (i === b.planted - 1 ? b.grow : 1) * 26
        ctx.strokeStyle = COLORS.success
        ctx.lineWidth = 4
        ctx.beginPath()
        ctx.moveTo(sx, y - 14)
        ctx.lineTo(sx, y - 14 - size)
        ctx.stroke()
        ctx.fillStyle = '#22c55e'
        ctx.beginPath()
        ctx.ellipse(sx + 7, y - 14 - size, 8, 4, -0.5, 0, Math.PI * 2)
        ctx.ellipse(sx - 7, y - 10 - size, 8, 4, 0.5, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    // кисть-пінцет: розхил пальців — 1 − u
    const c = this.cursor()
    if (input.handPos) {
      const gap = 10 + (1 - clamp(input.u, 0, 1)) * 46
      const reached = input.state === 'Holding' || input.state === 'Returning'
      ctx.save()
      ctx.lineCap = 'round'
      ctx.lineWidth = 14
      ctx.strokeStyle = reached ? COLORS.success : COLORS.accent
      ctx.beginPath()
      ctx.moveTo(c.x - 40, c.y - 60)
      ctx.quadraticCurveTo(c.x - gap, c.y - 20, c.x - gap / 2, c.y)
      ctx.moveTo(c.x + 40, c.y - 60)
      ctx.quadraticCurveTo(c.x + gap, c.y - 20, c.x + gap / 2, c.y)
      ctx.stroke()
      ctx.restore()
      if (this.seed !== 'none') {
        ctx.fillStyle = this.seed === 'ready' ? '#16a34a' : '#7c2d12'
        ctx.beginPath()
        ctx.ellipse(c.x, c.y + 4, 9, 13, 0.4, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    if (this.flash > 0) {
      ctx.fillStyle = `rgba(34, 197, 94, ${this.flash * 0.25})`
      ctx.fillRect(0, 0, w, h)
    }
    label(ctx, this.message, w / 2, h * 0.08 + 40, { size: 26, bg: 'rgba(255,255,255,0.88)' })
    label(ctx, `Посаджено: ${this.planted}`, w - 20, h * 0.08 + 90, { size: 24, align: 'right', bg: 'rgba(255,255,255,0.88)' })
  }
}
