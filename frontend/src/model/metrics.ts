/**
 * Миттєві кінематичні показники (підрозділ «Кінематичні показники руху кисті»).
 * Кути — у радіанах; у градуси переводяться лише для звітів (`toDegrees`).
 */
import { FINGERS, OPPOSED_FINGERS, type Finger, type OpposedFinger } from './config'
import { dist, dist2d, dot, mcpIndex, norm, sub, tipIndex, WRIST, type Vec3 } from './coords'
import { handScale } from './scale'

/** Радіани → градуси (лише для звітів) */
export const toDegrees = (rad: number): number => (rad * 180) / Math.PI

/**
 * Кут згинання суглоба φ(a, b, c) = π − arccos(((P_a − P_b)·(P_c − P_b)) / (‖P_a − P_b‖·‖P_c − P_b‖))
 * (формула кута згинання). Аргумент arccos обмежується до [−1; 1].
 * Для вироджених векторів нульової довжини повертає 0 (суглоб вважається випрямленим).
 */
export function jointAngle(Pa: Vec3, Pb: Vec3, Pc: Vec3, eps = 1e-9): number {
  const u = sub(Pa, Pb)
  const v = sub(Pc, Pb)
  const nu = norm(u)
  const nv = norm(v)
  if (nu < eps || nv < eps) return 0
  const cos = Math.min(1, Math.max(-1, dot(u, v) / (nu * nv)))
  return Math.PI - Math.acos(cos)
}

/**
 * Трійки точок для суглобів пальця (підрозділ «Кути згинання суглобів пальців»):
 * для k ≥ 2 — φ(0, 4k−3, 4k−2), φ(4k−3, 4k−2, 4k−1), φ(4k−2, 4k−1, 4k);
 * для великого пальця — φ(1, 2, 3), φ(2, 3, 4).
 */
export function jointTriples(k: Finger): [number, number, number][] {
  if (k === 1) {
    return [
      [1, 2, 3],
      [2, 3, 4],
    ]
  }
  const m = mcpIndex(k)
  return [
    [WRIST, m, m + 1],
    [m, m + 1, m + 2],
    [m + 1, m + 2, m + 3],
  ]
}

/** Кути всіх суглобів k-го пальця, рад */
export function fingerJointAngles(P: readonly Vec3[], k: Finger, eps?: number): number[] {
  return jointTriples(k).map(([a, b, c]) => jointAngle(P[a], P[b], P[c], eps))
}

/** Сумарне згинання пальця Φ_k = Σ_{j∈J_k} φ_j (формула сумарного згинання) */
export function fingerFlexion(P: readonly Vec3[], k: Finger, eps?: number): number {
  return fingerJointAngles(P, k, eps).reduce((a, b) => a + b, 0)
}

/**
 * Нормована відстань між кінчиком великого пальця і кінчиком k-го пальця
 * d_k = ‖P4 − P4k‖ / s, k = 2..5 (формула відстані між кінчиками).
 */
export function tipDistance(P: readonly Vec3[], k: OpposedFinger, s: number): number {
  return dist(P[tipIndex(1)], P[tipIndex(k)]) / s
}

/** Ступінь розкриття кисті O = (1/5)·Σ_{k=1..5} ‖P4k − P0‖ / s (формула ступеня розкриття) */
export function openness(P: readonly Vec3[], s: number): number {
  return FINGERS.reduce((acc, k) => acc + dist(P[tipIndex(k)], P[WRIST]), 0) / (5 * s)
}

/**
 * Відношення ширини долоні в площині зображення ‖P5 − P17‖_xy до s.
 * Мале значення означає, що кисть повернуто ребром до камери (підказка пацієнтові).
 */
export function palmWidthRatio(P: readonly Vec3[], s: number): number {
  return dist2d(P[mcpIndex(2)], P[mcpIndex(5)]) / s
}

/** Миттєві показники одного кадру */
export interface FrameMetrics {
  /** s — масштабний множник кисті (ізотропні пікселі) */
  s: number
  /** Кути суглобів кожного пальця, рад */
  joints: Record<Finger, number[]>
  /** Φ_k — сумарне згинання пальців, рад */
  Phi: Record<Finger, number>
  /** Φ̄ = (1/5)·ΣΦ_k, рад */
  PhiMean: number
  /** d_k, k = 2..5, частки s */
  d: Record<OpposedFinger, number>
  /** O — ступінь розкриття кисті, частки s */
  O: number
  /** Ширина долоні в площині зображення / s */
  palmWidthRatio: number
}

/**
 * Усі миттєві показники кадру за ізотропними (відфільтрованими) координатами.
 * @returns null, якщо масштабний множник вироджений (s ≈ 0)
 */
export function computeFrameMetrics(P: readonly Vec3[], eps = 1e-9): FrameMetrics | null {
  const s = handScale(P)
  if (!(s > eps)) return null
  const joints = {} as Record<Finger, number[]>
  const Phi = {} as Record<Finger, number>
  for (const k of FINGERS) {
    joints[k] = fingerJointAngles(P, k, eps)
    Phi[k] = joints[k].reduce((a, b) => a + b, 0)
  }
  const d = {} as Record<OpposedFinger, number>
  for (const k of OPPOSED_FINGERS) d[k] = tipDistance(P, k, s)
  return {
    s,
    joints,
    Phi,
    PhiMean: FINGERS.reduce((acc, k) => acc + Phi[k], 0) / 5,
    d,
    O: openness(P, s),
    palmWidthRatio: palmWidthRatio(P, s),
  }
}
