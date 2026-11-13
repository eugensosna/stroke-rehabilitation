/**
 * Рушій вправи без Vue: кадр → ізотропні координати → фільтр 1€ → показники → u → автомат → рівень.
 * Однаково працює з живим джерелом і з записаним сеансом (відтворення дає ті самі результати).
 */
import { normalize } from '@/model/calibration'
import { mergeConfig, OPPOSED_FINGERS, type Finger, type ModelConfig, type OpposedFinger } from '@/model/config'
import { toIsotropic, type Vec3 } from '@/model/coords'
import { levelThresholds, Staircase } from '@/model/adaptation'
import { ExerciseFsm, type FsmEvent, type FsmState, type RepetitionRecord } from '@/model/exerciseFsm'
import { HandFilter } from '@/model/handFilter'
import { isolationIndex, movedFingers } from '@/model/isolation'
import { computeFrameMetrics, type FrameMetrics } from '@/model/metrics'
import { amplitude, mean } from '@/model/temporal'
import type { HandFrame, TrackingMode } from '@/types/landmarks'
import type { CalibrationRanges, ControlMetric, ExerciseSettings } from '@/types/exercise'
import { metricValue, type ExerciseDefinition } from './definitions'
import { DepthTracker, pointingFinger } from './pointer'
import { handScale } from '@/model/scale'
import { tipIndex } from '@/model/coords'

/** Підказка пацієнтові */
export type HintId = 'handLost' | 'edgeOn' | 'unavailable' | 'rest' | 'straightFinger'

export const HINT_TEXTS: Record<HintId, string> = {
  handLost: 'Покладіть кисть у кадр вебкамери',
  edgeOn: 'Поверніть долоню до камери',
  unavailable: 'Рух замалий для цієї вправи. Повторіть калібрування',
  rest: 'Схоже, ви втомилися. Перепочиньте хвилинку',
  straightFinger: 'Випряміть один палець — вказівний або інший',
}

/**
 * Гра визначає, яка клавіша під кінчиком пальця і чи правильна вона (вправа з вказуванням).
 * Координати — екранні частки 0..1 з урахуванням дзеркалення.
 */
export interface PointerJudge {
  hitTest(x: number, y: number): string | null
  isCorrect(key: string): boolean
}

/** Вказівник: прямий палець, кінчик на екрані, глибина натискання */
export interface PointerFeedback {
  finger: OpposedFinger
  x: number
  y: number
  /** Клавіша під кінчиком пальця */
  hover: string | null
  /** Клавіша, зафіксована на початку натискання */
  locked: string | null
  /** Помилково натиснута клавіша (на кадрі невдачі) */
  wrong: string | null
}

/** Повторення разом із заданим пальцем і кутами суглобів у момент найбільшого u */
export interface EngineRepetition extends RepetitionRecord {
  target: Finger | null
  metric: ControlMetric
  /** Кути суглобів (рад) у кадрі з найбільшим u */
  peakJoints: Record<Finger, number[]> | null
}

/** Зворотний зв'язок для гри (без ключових точок) */
export interface EngineFeedback {
  /** Центр долоні в екранних координатах 0..1 (з урахуванням дзеркалення); null — кисті немає */
  handPos: { x: number; y: number } | null
  /** Протиставлення: дотик до іншого пальця (помилка) */
  wrongFinger: Finger | null
  /** Ізольовані рухи: пальці, що зрушили разом із заданим */
  movedFingers: Finger[]
  /** Вправа з вказуванням: палець-вказівник; null — прямого пальця немає */
  pointer?: PointerFeedback | null
  /**
   * Керування положенням: 21 точка кисті в екранних частках (дзеркально) для показу кисті в грі.
   * Лише для відображення в браузері, у звіти не потрапляє.
   */
  hand?: { x: number; y: number }[] | null
}

export interface EngineUpdate {
  t: number
  u: number
  state: FsmState
  level: number
  events: FsmEvent[]
  hint: HintId | null
  feedback: EngineFeedback
}

export interface EngineOptions {
  settings: ExerciseSettings
  /** Часткове перевизначення параметрів моделі (фільтр, пороги автомата тощо) */
  config?: Parameters<typeof mergeConfig>[0]
  startLevel: number
  target?: Finger | null
  /** Дзеркальне відображення на екрані (для handPos) */
  mirrored?: boolean
}

/** Статистика кадрів серії */
export interface FrameStatsSummary {
  frames: number
  handFrames: number
  firstTs: number | null
  lastTs: number | null
  mode: TrackingMode
  /** Тривалість активної роботи (без пауз), с */
  activeS: number
}

export class ExerciseEngine {
  readonly config: ModelConfig
  readonly fsm: ExerciseFsm
  readonly staircase: Staircase
  readonly startLevel: number
  readonly repetitions: EngineRepetition[] = []

  private readonly filter: HandFilter
  private _target: Finger | null
  private lastMetrics: FrameMetrics | null = null
  private lastHandT: number | null = null
  private edgeOnSince: number | null = null
  private restSuggested = false
  private peak: { u: number; joints: Record<Finger, number[]> } | null = null
  private prevT: number | null = null
  // вказування прямим пальцем
  private readonly depth: DepthTracker | null
  private judge: PointerJudge | null = null
  private lockedKey: string | null = null
  private lockedFinger: OpposedFinger | null = null
  private noPointer = false
  // керування положенням: кадри від попереднього результату гри
  private posSamples: { t: number[]; x: number[]; u: number[]; ts: number | null; paused: boolean } = {
    t: [],
    x: [],
    u: [],
    ts: null,
    paused: false,
  }
  private lastT = 0
  private readonly stats: FrameStatsSummary = {
    frames: 0,
    handFrames: 0,
    firstTs: null,
    lastTs: null,
    mode: 'local',
    activeS: 0,
  }

  constructor(
    readonly definition: ExerciseDefinition,
    readonly calibration: CalibrationRanges,
    private readonly options: EngineOptions,
  ) {
    const s = options.settings
    const d = definition.config
    this.config = mergeConfig({
      ...d,
      ...options.config,
      fsm: { ...d?.fsm, ...options.config?.fsm },
      levels: { ...s.levels, ...d?.levels, ...options.config?.levels },
      isolationMin: { ...s.isolationMin, ...options.config?.isolationMin },
      calibration: { ...options.config?.calibration, dxMin: { ...s.dxMin, ...options.config?.calibration?.dxMin } },
    })
    this.depth = definition.control === 'pointer' ? new DepthTracker(this.config.pointer.baselineTau) : null
    this.filter = new HandFilter(this.config.filter, this.config.fsm.tLost)
    this.staircase = new Staircase(options.startLevel, this.config.levels)
    this.startLevel = this.staircase.level
    this.fsm = new ExerciseFsm(this.config.fsm, () => levelThresholds(this.staircase.level, this.config.levels))
    this._target = options.target ?? definition.defaultTarget
  }

  get target(): Finger | null {
    return this._target
  }

  /** Поточний керуючий показник */
  get metric(): ControlMetric {
    return this.definition.metric(this._target)
  }

  get level(): number {
    return this.staircase.level
  }

  /** Вправа недоступна для поточного показника (замалий діапазон або немає калібрування) */
  get unavailable(): boolean {
    const r = this.calibration[this.metric]
    return !r || r.unavailable
  }

  /**
   * Керування положенням: результат повторення визначає гра (м'яч відбито — успіх, пропущено — невдача).
   * Повторення охоплює кадри від попереднього результату; A_m — розмах руху долоні за цей час.
   * @returns події success/fail і repetitionEnd
   */
  gameOutcome(success: boolean): FsmEvent[] {
    if (this.fsm.state === 'Paused') return []
    const t = this.lastT
    const s = this.posSamples
    const level = this.staircase.level
    const record: RepetitionRecord = {
      ts: s.ts ?? t,
      tm: success ? t : null,
      te: t,
      success,
      level,
      thresholds: levelThresholds(level, this.config.levels),
      holdTime: 0,
      t: s.t,
      x: s.x,
      u: s.u,
      Phi: null,
      pausedBefore: s.paused,
    }
    this.posSamples = { t: [], x: [], u: [], ts: t, paused: false }
    this.staircase.record(success)
    this.repetitions.push({ ...record, target: null, metric: this.metric, peakJoints: null })
    this.restSuggested = this.checkFatigue()
    return [{ type: success ? 'success' : 'fail', t }, { type: 'repetitionEnd', t, record }]
  }

  /** Гра з вказуванням: визначення клавіші під пальцем і її правильності */
  setPointerJudge(judge: PointerJudge | null): void {
    this.judge = judge
  }

  /** Зміна заданого пальця між повтореннями (піаніно) */
  setTarget(k: Finger | null): void {
    if (k === this._target) return
    this._target = k
    // незавершена спроба стосувалася іншого пальця
    if (this.fsm.attempt) this.fsm.cancelAttempt()
    this.peak = null
  }

  /** Обробка одного кадру з джерела ключових точок */
  process(frame: HandFrame): EngineUpdate {
    const t = frame.timestamp / 1000
    this.stats.frames++
    this.stats.firstTs ??= frame.timestamp
    this.stats.lastTs = frame.timestamp
    this.stats.mode = frame.source

    let P: Vec3[] | null = null
    if (frame.landmarks && frame.width > 0 && frame.height > 0) {
      P = this.filter.update(toIsotropic(frame.landmarks, frame.width, frame.height), t)
    } else {
      this.filter.update(null, t)
    }
    const m = P ? computeFrameMetrics(P, this.config.eps) : null
    const handPresent = m !== null
    if (handPresent) {
      this.stats.handFrames++
      this.lastHandT = t
    }
    this.lastMetrics = m

    const range = this.calibration[this.metric]
    const feedback: EngineFeedback = {
      handPos: P ? this.handPos(P, frame.width, frame.height) : null,
      wrongFinger: null,
      movedFingers: [],
    }

    let x: number | undefined
    let u = 0
    const pre: FsmEvent[] = []
    let isolationOk: boolean | undefined
    if (this.depth) {
      ;({ x, u, isolationOk } = this.pointerStep(t, P, m, frame, feedback, pre))
    } else if (this.definition.control === 'position') {
      x = feedback.handPos?.x
      u = x !== undefined && range ? normalize(x, range) : 0
      feedback.hand = P ? this.screenPoints(P, frame.width, frame.height) : null
      if (x !== undefined) {
        const s = this.posSamples
        s.ts ??= t
        s.t.push(t)
        s.x.push(x)
        s.u.push(u)
      }
    } else {
      x = m ? metricValue(m, this.metric) : undefined
      u = m && range && !range.unavailable && x !== undefined ? normalize(x, range) : 0
      if (m) isolationOk = this.extraCondition(m, feedback)
    }

    if (this.prevT !== null && this.fsm.state !== 'Paused') this.stats.activeS += Math.min(0.5, Math.max(0, t - this.prevT))
    this.prevT = t

    this.lastT = t
    // керування положенням: автомат лише стежить за паузою (u = 0 — спроб він не починає)
    const fsmU = this.definition.control === 'position' ? 0 : u
    let events = [...pre, ...this.fsm.step({ t, u: fsmU, handPresent, isolationOk, x, Phi: m?.Phi })]
    if (this.depth) events = this.afterPointerEvents(events, feedback)

    // кути суглобів у момент найбільшого u поточної спроби
    if (m && this.fsm.attempt && (!this.peak || u > this.peak.u)) {
      this.peak = { u, joints: m.joints }
    }

    for (const e of events) {
      if (e.type === 'moveStart') this.peak = m ? { u, joints: m.joints } : null
      if (e.type === 'success' || e.type === 'fail') this.staircase.record(e.type === 'success')
      if (e.type === 'paused') {
        this.peak = null
        this.posSamples.paused = true
      }
      if (e.type === 'repetitionEnd') {
        const target = this.depth ? this.lockedFinger : this._target
        this.repetitions.push({ ...e.record, target, metric: this.metric, peakJoints: this.peak?.joints ?? null })
        this.peak = null
        this.restSuggested = this.checkFatigue()
      }
    }

    return {
      t,
      u,
      state: this.fsm.state,
      level: this.staircase.level,
      events,
      hint: this.hint(t, m),
      feedback,
    }
  }

  /**
   * Вказування: палець-вказівник, кінчик на екрані, Z і u натискання; рішення щодо поточної спроби
   * (скасування, помилкова клавіша) до кроку автомата.
   */
  private pointerStep(
    t: number,
    P: Vec3[] | null,
    m: FrameMetrics | null,
    frame: HandFrame,
    fb: EngineFeedback,
    events: FsmEvent[],
  ): { x: number | undefined; u: number; isolationOk: boolean | undefined } {
    const depth = this.depth as DepthTracker
    const finger = m ? pointingFinger(m.Phi, this.config.pointer.straightMax) : null
    this.noPointer = !!m && finger === null
    if (!P || !m || finger === null) {
      fb.pointer = null
      if (!m) depth.reset()
      // палець зігнули — натискання скасовується
      if (finger === null && this.fsm.attempt && this.fsm.state !== 'Returning') this.cancelPointerAttempt()
      return { x: undefined, u: 0, isolationOk: undefined }
    }
    const tip = P[tipIndex(finger)]
    const sx = tip.x / frame.width
    const pos = { x: this.options.mirrored === false ? sx : 1 - sx, y: tip.y / frame.height }
    const hover = this.judge?.hitTest(pos.x, pos.y) ?? null
    fb.pointer = { finger, ...pos, hover, locked: this.lockedKey, wrong: null }

    const state = this.fsm.state
    const z = depth.update(handScale(P), t, state !== 'Waiting')
    const range = this.calibration.Z ?? { xr: 0, xg: 0.2 }
    const u = normalize(z, range)
    const { thetaR, hysteresis: h } = this.config.fsm

    let isolationOk: boolean | undefined
    if (state === 'Moving' || state === 'Holding') {
      const correct = this.lockedKey !== null && !!this.judge?.isCorrect(this.lockedKey)
      isolationOk = correct
      if (state === 'Moving' && u < thetaR - h) {
        // кисть відвели, не натиснувши, — спроба не зараховується
        this.cancelPointerAttempt()
      } else if (state === 'Moving' && u >= (this.fsm.attempt?.thresholds.thetaG ?? 1) && !correct) {
        fb.pointer.wrong = this.lockedKey
        events.push(...this.fsm.forceFail(t))
      }
    }
    return { x: z, u, isolationOk }
  }

  /** Початок натискання фіксує клавішу; натискання поза клавішами не вважається спробою */
  private afterPointerEvents(events: FsmEvent[], fb: EngineFeedback): FsmEvent[] {
    if (events.some((e) => e.type === 'repetitionEnd')) this.lockedKey = null
    if (!events.some((e) => e.type === 'moveStart')) return events
    const key = fb.pointer?.hover ?? null
    if (key === null) {
      this.cancelPointerAttempt()
      return events.filter((e) => e.type !== 'moveStart')
    }
    this.lockedKey = key
    this.lockedFinger = fb.pointer?.finger ?? null
    if (fb.pointer) fb.pointer.locked = key
    return events
  }

  private cancelPointerAttempt() {
    this.fsm.cancelAttempt()
    this.lockedKey = null
    this.peak = null
  }

  /** Статистика кадрів для звіту */
  frameStats(): FrameStatsSummary {
    return { ...this.stats }
  }

  /** Додаткова умова переходу в «Утримання» і зворотний зв'язок для гри */
  private extraCondition(m: FrameMetrics, fb: EngineFeedback): boolean | undefined {
    const k = this._target
    if (this.definition.id === 'opposition' && k && k !== 1) {
      // d_k заданого пальця — найменша серед d_2..d_5
      let best: OpposedFinger = 2
      for (const j of OPPOSED_FINGERS) if (m.d[j] < m.d[best]) best = j
      if (best !== k) {
        const r = this.calibration[`d${best}`]
        const thetaG = levelThresholds(this.staircase.level, this.config.levels).thetaG
        if (r && !r.unavailable && normalize(m.d[best], r) >= thetaG) fb.wrongFinger = best
      }
      return best === k
    }
    if (this.definition.id === 'isolatedFinger' && k) {
      const att = this.fsm.attempt
      if (!att?.Phi) return true
      // ΔΦ_j — розмах Φ_j від початку повторення до поточного кадру
      const delta = {} as Record<Finger, number>
      for (const j of [1, 2, 3, 4, 5] as Finger[]) {
        const series = att.Phi[j]
        let lo = m.Phi[j]
        let hi = m.Phi[j]
        for (const v of series) {
          if (v < lo) lo = v
          if (v > hi) hi = v
        }
        delta[j] = hi - lo
      }
      fb.movedFingers = movedFingers(k, delta, this.config.movedFingerRatio, this.config.isolationEps)
      return isolationIndex(k, delta, this.config.isolationEps) >= this.config.isolationMin[k]
    }
    return undefined
  }

  /** Точки кисті в екранних частках (дзеркально) */
  private screenPoints(P: Vec3[], W: number, H: number): { x: number; y: number }[] {
    const mirrored = this.options.mirrored !== false
    return P.map((p) => ({ x: mirrored ? 1 - p.x / W : p.x / W, y: p.y / H }))
  }

  private handPos(P: Vec3[], W: number, H: number): { x: number; y: number } {
    const idx = [0, 5, 9, 13, 17]
    const x = idx.reduce((a, i) => a + P[i].x, 0) / idx.length / W
    const y = idx.reduce((a, i) => a + P[i].y, 0) / idx.length / H
    return { x: this.options.mirrored === false ? x : 1 - x, y }
  }

  private hint(t: number, m: FrameMetrics | null): HintId | null {
    const h = this.config.hints
    if (m && this.noPointer) return 'straightFinger'
    if (!m) {
      if (this.lastHandT === null || t - this.lastHandT > h.handLostHintS) return 'handLost'
    }
    if (m && m.palmWidthRatio < h.palmWidthRatioMin) {
      this.edgeOnSince ??= t
      if (t - this.edgeOnSince >= h.edgeOnHoldS) return 'edgeOn'
    } else if (m) {
      this.edgeOnSince = null
    }
    if (this.unavailable) return 'unavailable'
    if (this.restSuggested) return 'rest'
    return null
  }

  /** Помітне зниження частки успішних спроб і середньої амплітуди наприкінці серії */
  private checkFatigue(): boolean {
    const h = this.config.hints
    const n = h.fatigueWindow
    const reps = this.repetitions
    if (reps.length < 2 * n) return false
    const first = reps.slice(0, n)
    const last = reps.slice(-n)
    const rate = (rs: EngineRepetition[]) => rs.filter((r) => r.success).length / rs.length
    const amp = (rs: EngineRepetition[]) => mean(rs.map((r) => amplitude(r.x) ?? 0)) ?? 0
    const a0 = amp(first)
    const successDrop = rate(first) - rate(last) >= h.fatigueSuccessDrop
    const ampDrop = a0 > 0 && (a0 - amp(last)) / a0 >= h.fatigueAmplitudeDrop
    return successDrop && ampDrop
  }
}
