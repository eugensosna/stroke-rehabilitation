/**
 * Частота обробки F = (K − 1)/(t_K − t_1) і частка кадрів з кистю за ковзне вікно.
 * Винесено окремо від Vue для тестування.
 */
export class FrameStats {
  private items: { t: number; hand: boolean }[] = []
  private lowSince: number | null = null
  private lowFired = false

  constructor(
    private readonly windowMs: number,
    private readonly minFps: number,
  ) {}

  /**
   * Новий оброблений кадр.
   * @returns true, якщо щойно виконалася умова lowFps (fps < minFps довше інтервалу усереднення)
   */
  push(t: number, hand: boolean): boolean {
    this.items.push({ t, hand })
    while (this.items.length > 0 && t - this.items[0].t > this.windowMs) this.items.shift()
    // вікно ще не заповнене (початок роботи) — частоту не оцінюємо
    if (this.span < this.windowMs * 0.9) return false
    if (this.fps >= this.minFps) {
      this.lowSince = null
      return false
    }
    this.lowSince ??= t
    if (!this.lowFired && t - this.lowSince >= this.windowMs) {
      this.lowFired = true
      return true
    }
    return false
  }

  get span(): number {
    const n = this.items.length
    return n < 2 ? 0 : this.items[n - 1].t - this.items[0].t
  }

  /** F = (K − 1)/(t_K − t_1), кадр/с */
  get fps(): number {
    const span = this.span
    return span > 0 ? ((this.items.length - 1) * 1000) / span : 0
  }

  /** Частка кадрів з кистю */
  get detectionRate(): number {
    const n = this.items.length
    return n === 0 ? 0 : this.items.filter((i) => i.hand).length / n
  }

  reset(): void {
    this.items = []
    this.lowSince = null
    this.lowFired = false
  }
}
