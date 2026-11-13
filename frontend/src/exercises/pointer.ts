/**
 * Вказування прямим пальцем і «натискання» наближенням кисті до камери (гра «Кодовий замок»).
 * Чиста логіка без Vue/DOM.
 */
import { OPPOSED_FINGERS, type Finger, type OpposedFinger } from '@/model/config'

/**
 * Палець-вказівник: перший прямий палець від вказівного до мізинця (Φ_k < straightMax).
 * Великий палець не використовується.
 * @param Phi сумарне згинання пальців Φ_k, рад
 */
export function pointingFinger(Phi: Readonly<Record<Finger, number>>, straightMax: number): OpposedFinger | null {
  for (const k of OPPOSED_FINGERS) if (Phi[k] < straightMax) return k
  return null
}

/**
 * Наближення до камери відносно базової відстані.
 *
 * Видимий розмір кисті обернено пропорційний відстані до камери: s ∝ 1/D. Базова відстань — ковзне
 * середнє s₀ (стала часу τ); наближення як частка базової відстані Z = 1 − D/D₀ = 1 − s₀/s.
 * Натискання — Z ≥ 0,2 (кисть наблизилася на 20 % відстані). Під час спроби s₀ не оновлюється.
 */
export class DepthTracker {
  private s0: number | null = null
  private lastT: number | null = null

  constructor(private readonly tau: number) {}

  /** Базовий масштаб s₀ (null — ще немає) */
  get baseline(): number | null {
    return this.s0
  }

  /**
   * @param s масштаб кисті в поточному кадрі (ізотропні пікселі)
   * @param t час, с
   * @param freeze не оновлювати s₀ (триває спроба натискання)
   * @returns Z — частка наближення (від'ємна, якщо кисть віддалилася)
   */
  update(s: number, t: number, freeze: boolean): number {
    if (this.s0 === null || this.lastT === null || !(s > 0)) {
      this.s0 = s > 0 ? s : null
      this.lastT = t
      return 0
    }
    const z = 1 - this.s0 / s
    if (!freeze) {
      // експоненційне ковзне середнє з урахуванням нерівномірних Δt
      const dt = Math.max(0, t - this.lastT)
      const a = 1 - Math.exp(-dt / this.tau)
      this.s0 += a * (s - this.s0)
    }
    this.lastT = t
    return z
  }

  reset(): void {
    this.s0 = null
    this.lastT = null
  }
}
