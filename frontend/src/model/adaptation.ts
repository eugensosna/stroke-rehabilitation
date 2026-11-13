/**
 * Адаптація складності вправ (підрозділ «Адаптація складності вправ»).
 */
import type { LevelParams } from './config'

/** Обмеження рівня межами [L_min; L_max] */
export function clampLevel(L: number, p: Pick<LevelParams, 'Lmin' | 'Lmax'>): number {
  return Math.min(p.Lmax, Math.max(p.Lmin, Math.round(L)))
}

/** Цільовий поріг θ_g(L) = θ_g,1 + (L − 1)·Δθ, не більше 1 (формула цільового порога) */
export function thetaG(L: number, p: LevelParams): number {
  return Math.min(1, p.thetaG1 + (L - 1) * p.dTheta)
}

/** Час утримання t_h(L) = t_h,1 + (L − 1)·Δt_h, с */
export function tHold(L: number, p: LevelParams): number {
  return Math.max(0, p.tHold1 + (L - 1) * p.dTHold)
}

/** Допустимий час спроби T_max(L) = T_max,1 − (L − 1)·ΔT, не менше T_max,min, с */
export function tMax(L: number, p: LevelParams): number {
  return Math.max(p.tMaxMin, p.tMax1 - (L - 1) * p.dTMax)
}

/** Параметри автомата для рівня L */
export interface LevelThresholds {
  level: number
  thetaG: number
  tHold: number
  tMax: number
}

/** Пороги автомата на рівні L */
export function levelThresholds(L: number, p: LevelParams): LevelThresholds {
  return { level: L, thetaG: thetaG(L, p), tHold: tHold(L, p), tMax: tMax(L, p) }
}

/**
 * Правило «два вгору — один вниз» (формула зміни рівня):
 * L_{n+1} = min(L_max, max(L_min, L_n + r_n·r_{n−1}·δ(L_n, L_{n−1}) − (1 − r_n))).
 * @param Ln рівень n-ї спроби
 * @param rn результат n-ї спроби (true — успішна)
 * @param prev попередня спроба (рівень і результат) або null для першої спроби
 */
export function nextLevel(
  Ln: number,
  rn: boolean,
  prev: { level: number; success: boolean } | null,
  p: Pick<LevelParams, 'Lmin' | 'Lmax'>,
): number {
  const r = rn ? 1 : 0
  const r1 = prev?.success ? 1 : 0
  const delta = prev && prev.level === Ln ? 1 : 0
  return clampLevel(Ln + r * r1 * delta - (1 - r), p)
}

/** Рівень першої спроби наступного сеансу: останній досягнутий − 1, у межах [L_min; L_max] */
export function sessionStartLevel(lastLevel: number | null | undefined, p: Pick<LevelParams, 'Lmin' | 'Lmax'>): number {
  if (lastLevel === null || lastLevel === undefined) return p.Lmin
  return clampLevel(lastLevel - 1, p)
}

/**
 * Сходи рівнів складності: зберігає історію спроб і застосовує правило «два вгору — один вниз».
 */
export class Staircase {
  private prev: { level: number; success: boolean } | null = null
  private current: number

  constructor(
    startLevel: number,
    private readonly params: Pick<LevelParams, 'Lmin' | 'Lmax'>,
  ) {
    this.current = clampLevel(startLevel, params)
  }

  /** Поточний рівень L_n */
  get level(): number {
    return this.current
  }

  /**
   * Результат спроби на поточному рівні.
   * @returns рівень наступної спроби
   */
  record(success: boolean): number {
    const Ln = this.current
    this.current = nextLevel(Ln, success, this.prev, this.params)
    this.prev = { level: Ln, success }
    return this.current
  }
}
