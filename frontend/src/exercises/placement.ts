/**
 * Оцінка розміщення кисті в кадрі та підказки пацієнтові, що зробити далі
 * («посуньте праворуч», «ближче до камери», «поверніть долоню»…).
 * Чиста логіка без Vue/DOM; працює з сирими (недзеркальними) ключовими точками,
 * а напрямки формулює так, як пацієнт бачить себе на дзеркальному екрані.
 */
import type { HintParams } from '@/model/config'
import { toIsotropic, type Vec3 } from '@/model/coords'
import { palmWidthRatio } from '@/model/metrics'
import { handScale } from '@/model/scale'

export type PlacementIssue =
  | 'noHand'
  | 'moveRight'
  | 'moveLeft'
  | 'moveUp'
  | 'moveDown'
  | 'closer'
  | 'farther'
  | 'edgeOn'

/** Порядок важливості: першою показується найважливіша проблема */
const PRIORITY: PlacementIssue[] = ['noHand', 'farther', 'moveRight', 'moveLeft', 'moveUp', 'moveDown', 'closer', 'edgeOn']

export const PLACEMENT_TEXTS: Record<PlacementIssue | 'ok', string> = {
  noHand: 'Кисть не видно. Покладіть кисть перед камерою',
  moveRight: 'Посуньте кисть праворуч',
  moveLeft: 'Посуньте кисть ліворуч',
  moveUp: 'Підніміть кисть вище',
  moveDown: 'Опустіть кисть нижче',
  closer: 'Піднесіть кисть ближче до камери',
  farther: 'Відсуньте кисть далі від камери',
  edgeOn: 'Поверніть долоню до камери',
  ok: 'Кисть розміщено добре',
}

export type PlacementParams = Pick<
  HintParams,
  'edgeMargin' | 'centerMin' | 'centerMax' | 'scaleMin' | 'scaleMax' | 'palmWidthRatioMin'
>

export interface PlacementAssessment {
  /** Усі виявлені проблеми в порядку важливості (порожньо — все добре) */
  issues: PlacementIssue[]
  /** Центр долоні на екрані (дзеркально), частки 0..1 */
  center: { x: number; y: number } | null
  /** s / min(W, H) — відносний розмір кисті */
  scale: number | null
  /** ‖P5 − P17‖_xy / s */
  palmRatio: number | null
}

/**
 * @param landmarks нормовані ключові точки (0..1) або null
 * @param mirrored чи екран показує дзеркальне зображення (тоді «праворуч» для пацієнта = менший x кадру)
 */
export function assessPlacement(
  landmarks: readonly Vec3[] | null,
  W: number,
  H: number,
  params: PlacementParams,
  mirrored = true,
): PlacementAssessment {
  if (!landmarks || landmarks.length < 21 || W <= 0 || H <= 0) {
    return { issues: ['noHand'], center: null, scale: null, palmRatio: null }
  }
  const sx = (x: number) => (mirrored ? 1 - x : x)
  const xs = landmarks.map((p) => sx(p.x))
  const ys = landmarks.map((p) => p.y)
  const palm = [0, 5, 9, 13, 17]
  const center = {
    x: palm.reduce((a, i) => a + sx(landmarks[i].x), 0) / palm.length,
    y: palm.reduce((a, i) => a + landmarks[i].y, 0) / palm.length,
  }
  const P = toIsotropic(landmarks, W, H)
  const s = handScale(P)
  const scale = s / Math.min(W, H)
  const palmRatio = s > 0 ? palmWidthRatio(P, s) : 0

  const found = new Set<PlacementIssue>()
  const m = params.edgeMargin
  // обрізано краєм кадру або центр долоні надто близько до краю
  if (Math.min(...xs) < m || center.x < params.centerMin) found.add('moveRight')
  if (Math.max(...xs) > 1 - m || center.x > params.centerMax) found.add('moveLeft')
  if (Math.min(...ys) < m || center.y < params.centerMin) found.add('moveDown')
  if (Math.max(...ys) > 1 - m || center.y > params.centerMax) found.add('moveUp')
  // кисть обрізано з протилежних боків — вона просто завелика
  if ((found.has('moveRight') && found.has('moveLeft')) || (found.has('moveUp') && found.has('moveDown'))) {
    found.delete('moveRight')
    found.delete('moveLeft')
    found.delete('moveUp')
    found.delete('moveDown')
    found.add('farther')
  }
  if (scale < params.scaleMin) found.add('closer')
  if (scale > params.scaleMax) found.add('farther')
  if (palmRatio < params.palmWidthRatioMin) found.add('edgeOn')

  return { issues: PRIORITY.filter((i) => found.has(i)), center, scale, palmRatio }
}

export interface PlacementLogEntry {
  /** Час, с (часова мітка кадру) */
  t: number
  issue: PlacementIssue | 'ok'
  text: string
}

/**
 * Стабілізує підказку (проблема має триматися holdS секунд) і веде журнал змін:
 * новий запис з'являється лише тоді, коли змінюється головна підказка.
 */
export class PlacementGuide {
  private candidate: PlacementIssue | 'ok' | null = null
  private candidateSince = 0
  current: PlacementIssue | 'ok' | null = null
  last: PlacementAssessment | null = null
  readonly log: PlacementLogEntry[] = []

  constructor(
    private readonly params: PlacementParams & { placementHoldS: number },
    private readonly maxLog = 30,
    private readonly mirrored = true,
  ) {}

  /** Повертає новий запис журналу, якщо підказка змінилася */
  update(landmarks: readonly Vec3[] | null, W: number, H: number, t: number): PlacementLogEntry | null {
    const a = assessPlacement(landmarks, W, H, this.params, this.mirrored)
    this.last = a
    const issue = a.issues[0] ?? 'ok'
    if (issue !== this.candidate) {
      this.candidate = issue
      this.candidateSince = t
    }
    // перша оцінка показується одразу; далі — після утримання
    const stable = this.current === null || t - this.candidateSince >= this.params.placementHoldS
    if (!stable || issue === this.current) return null
    this.current = issue
    const entry: PlacementLogEntry = { t, issue, text: PLACEMENT_TEXTS[issue] }
    this.log.push(entry)
    if (this.log.length > this.maxLog) this.log.shift()
    return entry
  }

  reset() {
    this.candidate = null
    this.current = null
    this.last = null
    this.log.length = 0
  }
}
