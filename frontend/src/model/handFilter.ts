/**
 * Фільтрація всіх ключових точок кисті (підрозділ «Фільтрація координат»).
 */
import type { OneEuroParams } from './config'
import { LANDMARK_COUNT, type Vec3 } from './coords'
import { OneEuroFilter } from './oneEuro'

/**
 * 63 фільтри 1€ (21 точка × 3 координати).
 *
 * Кадр без кисті не оновлює стан фільтрів. Якщо кисті немає довше t_lost,
 * фільтри скидаються, щоб не згладжувати стрибок між старим і новим положенням.
 */
export class HandFilter {
  private readonly filters: OneEuroFilter[]
  private lastSeen: number | null = null

  /**
   * @param params параметри фільтра 1€
   * @param tLost t_lost, с
   */
  constructor(
    params: OneEuroParams,
    private readonly tLost: number,
  ) {
    this.filters = Array.from({ length: LANDMARK_COUNT * 3 }, () => new OneEuroFilter(params))
  }

  /**
   * Обробка кадру.
   * @param points ізотропні координати 21 точки або null, якщо кисть не виявлено
   * @param t часова мітка кадру, с
   * @returns відфільтровані точки або null для кадру без кисті
   */
  update(points: readonly Vec3[] | null, t: number): Vec3[] | null {
    if (this.lastSeen !== null && t - this.lastSeen > this.tLost) this.reset()
    if (!points) return null
    this.lastSeen = t
    return points.map((p, i) => ({
      x: this.filters[3 * i].filter(p.x, t),
      y: this.filters[3 * i + 1].filter(p.y, t),
      z: this.filters[3 * i + 2].filter(p.z, t),
    }))
  }

  /** Скидання всіх фільтрів */
  reset(): void {
    this.filters.forEach((f) => f.reset())
    this.lastSeen = null
  }
}
