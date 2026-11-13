/**
 * Часові показники (підрозділ «Амплітуда, частота і ритм повторень»).
 */

/**
 * Амплітуда повторення A_m = max x(t) − min x(t) на [t_m^s; t_m^e] (формула амплітуди).
 * @returns null для порожньої послідовності
 */
export function amplitude(values: readonly number[]): number | null {
  if (values.length === 0) return null
  let min = Infinity
  let max = -Infinity
  for (const v of values) {
    if (v < min) min = v
    if (v > max) max = v
  }
  return max - min
}

/** Момент повторення для обчислення інтервалів */
export interface RepetitionMoment {
  /** t_m — момент досягнення цілі, с */
  t: number
  /** Між попереднім і цим повторенням була пауза через втрату кисті */
  pausedBefore?: boolean
}

/**
 * Інтервали T_m = t_m − t_{m−1}. Інтервали, що містять паузу, виключаються.
 */
export function repetitionIntervals(moments: readonly RepetitionMoment[]): number[] {
  const out: number[] = []
  for (let m = 1; m < moments.length; m++) {
    if (moments[m].pausedBefore) continue
    out.push(moments[m].t - moments[m - 1].t)
  }
  return out
}

/** Середнє значення */
export function mean(values: readonly number[]): number | null {
  return values.length === 0 ? null : values.reduce((a, b) => a + b, 0) / values.length
}

/**
 * Частота повторень f = 1/T̄, T̄ = (1/(M−1))·ΣT_m (формула частоти), Гц.
 * @param intervals інтервали T_m, с (без інтервалів з паузою)
 * @returns null, якщо інтервалів менше двох (M < 3)
 */
export function repetitionFrequency(intervals: readonly number[]): number | null {
  if (intervals.length < 2) return null
  const T = mean(intervals) as number
  return T > 0 ? 1 / T : null
}

/**
 * Коефіцієнт варіації інтервалів V = σ_T/T̄·100 %,
 * σ_T = sqrt(Σ(T_m − T̄)² / (M − 2)) (формула коефіцієнта варіації).
 * @returns null, якщо інтервалів менше двох (M < 3)
 */
export function intervalVariation(intervals: readonly number[]): number | null {
  const n = intervals.length // n = M − 1
  if (n < 2) return null
  const T = mean(intervals) as number
  if (!(T > 0)) return null
  const ss = intervals.reduce((acc, x) => acc + (x - T) ** 2, 0)
  const sigma = Math.sqrt(ss / (n - 1)) // n − 1 = M − 2
  return (sigma / T) * 100
}
