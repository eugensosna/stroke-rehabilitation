/**
 * Ізольованість руху пальця (підрозділ «Ізольованість руху пальця»).
 */
import { FINGERS, type Finger } from './config'

/**
 * Показник ізольованості I_k = 1 − (1/4)·Σ_{j≠k} min(1, ΔΦ_j/ΔΦ_k) (формула ізольованості).
 * @param k заданий палець
 * @param deltaPhi розмахи ΔΦ_j сумарного кута згинання кожного пальця за повторення, рад
 * @param eps ΔΦ_k, нижче якого рух заданого пальця вважається відсутнім — тоді I_k = 0
 */
export function isolationIndex(k: Finger, deltaPhi: Record<Finger, number>, eps = 1e-6): number {
  const dk = deltaPhi[k]
  if (!(dk > eps)) return 0
  let sum = 0
  for (const j of FINGERS) {
    if (j === k) continue
    sum += Math.min(1, Math.max(0, deltaPhi[j]) / dk)
  }
  return 1 - sum / 4
}

/**
 * Пальці, які під час руху заданого пальця зрушили помітно: ΔΦ_j/ΔΦ_k ≥ ratio.
 * Використовується для підказки «зрушив інший палець».
 */
export function movedFingers(
  k: Finger,
  deltaPhi: Record<Finger, number>,
  ratio: number,
  eps = 1e-6,
): Finger[] {
  const dk = deltaPhi[k]
  return FINGERS.filter((j) => {
    if (j === k) return false
    if (!(dk > eps)) return deltaPhi[j] > eps
    return deltaPhi[j] / dk >= ratio
  })
}
