/**
 * Калібрування показників під кисть пацієнта (підрозділ «Калібрування показників під кисть пацієнта»).
 */
import { percentile } from './percentile'

/** Напрям зміни показника під час руху */
export type MetricDirection = 'increasing' | 'decreasing'

/** Індивідуальний діапазон керуючого показника */
export interface CalibrationRange {
  /** x_r — значення у вихідному положенні */
  xr: number
  /** x_g — значення в положенні максимального руху */
  xg: number
  /** |x_g − x_r| < Δx_min — вправа для цього показника недоступна */
  unavailable: boolean
}

/**
 * Діапазон за записом значень показника: x_r і x_g — 5-й і 95-й процентилі
 * (для спадних показників — навпаки).
 * @param values значення показника за час запису
 * @param direction напрям зміни показника під час руху
 * @param dxMin Δx_min — мінімально допустимий діапазон
 * @param pLow, pHigh частки процентилів (типово 0,05 і 0,95)
 * @returns null, якщо записів немає
 */
export function calibrateRange(
  values: readonly number[],
  direction: MetricDirection,
  dxMin: number,
  pLow = 0.05,
  pHigh = 0.95,
): CalibrationRange | null {
  const lo = percentile(values, pLow)
  const hi = percentile(values, pHigh)
  if (lo === null || hi === null) return null
  const [xr, xg] = direction === 'increasing' ? [lo, hi] : [hi, lo]
  return { xr, xg, unavailable: Math.abs(xg - xr) < dxMin }
}

/** Обмеження значення до [0; 1] */
export const clamp01 = (v: number): number => Math.min(1, Math.max(0, v))

/**
 * Нормований ступінь виконання руху u = min(1, max(0, (x − x_r)/(x_g − x_r)))
 * (формула нормованого показника). Напрям руху враховується знаком x_g − x_r.
 */
export function normalize(x: number, range: Pick<CalibrationRange, 'xr' | 'xg'>): number {
  const span = range.xg - range.xr
  if (span === 0) return 0
  return clamp01((x - range.xr) / span)
}

/**
 * Оновлення діапазону з урахуванням найбільшої амплітуди попереднього сеансу
 * (скорочене калібрування): x_g віддаляється від x_r щонайменше на A_max.
 * @param range діапазон скороченого калібрування
 * @param maxAmplitude A_max попереднього сеансу (в одиницях показника)
 * @param dxMin Δx_min для перерахунку ознаки недоступності
 */
export function extendRange(
  range: CalibrationRange,
  maxAmplitude: number | null | undefined,
  dxMin: number,
): CalibrationRange {
  if (maxAmplitude === null || maxAmplitude === undefined || !(maxAmplitude > 0)) return range
  const sign = range.xg >= range.xr ? 1 : -1
  const span = Math.max(Math.abs(range.xg - range.xr), maxAmplitude)
  const xg = range.xr + sign * span
  return { xr: range.xr, xg, unavailable: Math.abs(xg - range.xr) < dxMin }
}
