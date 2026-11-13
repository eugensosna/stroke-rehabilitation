/**
 * Процентиль з лінійною інтерполяцією за NIST/SEMATECH e-Handbook of Statistical Methods,
 * розд. 7.2.6.2 «Percentiles» (підрозділ «Калібрування показників під кисть пацієнта»).
 *
 * Ранг p(N + 1) у впорядкованій вибірці; між сусідніми елементами — лінійна інтерполяція;
 * для рангу ≤ 1 — найменший елемент, для рангу ≥ N — найбільший.
 *
 * @param values вибірка (не обов'язково впорядкована)
 * @param p частка, 0..1 (наприклад, 0,05 для 5-го процентиля)
 * @returns null для порожньої вибірки
 */
export function percentile(values: readonly number[], p: number): number | null {
  const n = values.length
  if (n === 0) return null
  const y = [...values].sort((a, b) => a - b)
  const rank = p * (n + 1)
  if (rank <= 1) return y[0]
  if (rank >= n) return y[n - 1]
  const k = Math.floor(rank)
  const frac = rank - k
  return y[k - 1] + frac * (y[k] - y[k - 1])
}
