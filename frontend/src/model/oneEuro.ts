/**
 * Фільтр 1€ (Casiez, Roussel, Vogel, 2012) — підрозділ «Фільтрація координат».
 */
import type { OneEuroParams } from './config'

/**
 * Коефіцієнт згладжування α = 1 / (1 + 1/(2π·f_c·Δt)) (формула фільтра 1€).
 * @param fc частота зрізу, Гц
 * @param dt інтервал між кадрами, с
 */
export function smoothingFactor(fc: number, dt: number): number {
  return 1 / (1 + 1 / (2 * Math.PI * fc * dt))
}

/**
 * Фільтр 1€ для однієї координати.
 *
 * x̂_n = α_n·x_n + (1 − α_n)·x̂_{n−1}, f_c,n = f_c,min + β·|dx̂_n| (формули фільтра 1€ і частоти зрізу).
 * Похідна згладжується фільтром з фіксованою частотою зрізу `dCutoff`.
 * Δt береться з часових міток кадрів, а не з номінальної частоти.
 */
export class OneEuroFilter {
  private xPrev: number | null = null
  private dxPrev = 0
  private tPrev = 0

  constructor(private readonly params: OneEuroParams) {}

  /**
   * Відфільтроване значення.
   * @param x вхідне значення x_n
   * @param t часова мітка кадру, с
   */
  filter(x: number, t: number): number {
    if (this.xPrev === null) {
      this.xPrev = x
      this.dxPrev = 0
      this.tPrev = t
      return x
    }
    const dt = t - this.tPrev
    // кадр з тією самою або меншою міткою не несе нової інформації про час
    if (!(dt > 0)) return this.xPrev

    const { fcMin, beta, dCutoff } = this.params
    const dx = (x - this.xPrev) / dt
    const aD = smoothingFactor(dCutoff, dt)
    const dxHat = aD * dx + (1 - aD) * this.dxPrev
    const fc = fcMin + beta * Math.abs(dxHat)
    const a = smoothingFactor(fc, dt)
    const xHat = a * x + (1 - a) * this.xPrev

    this.xPrev = xHat
    this.dxPrev = dxHat
    this.tPrev = t
    return xHat
  }

  /** Скидання стану: наступне значення пройде без згладжування */
  reset(): void {
    this.xPrev = null
    this.dxPrev = 0
    this.tPrev = 0
  }
}
