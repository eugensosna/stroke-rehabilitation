/**
 * Скінченний автомат ігрової вправи (підрозділ «Скінченний автомат вправи», рис. «Діаграма станів»).
 * Без залежностей від Vue і DOM.
 */
import type { Finger, FsmParams } from './config'
import type { LevelThresholds } from './adaptation'

/** Стани автомата: «Очікування», «Рух», «Утримання», «Повернення», «Пауза» */
export type FsmState = 'Waiting' | 'Moving' | 'Holding' | 'Returning' | 'Paused'

/** Українські назви станів для інтерфейсу */
export const FSM_STATE_LABELS: Record<FsmState, string> = {
  Waiting: 'Очікування',
  Moving: 'Рух',
  Holding: 'Утримання',
  Returning: 'Повернення',
  Paused: 'Пауза',
}

/** Вхід автомата на кожен кадр */
export interface FsmInput {
  /** Часова мітка кадру, с */
  t: number
  /** u — нормований ступінь виконання руху (0, якщо кисті немає) */
  u: number
  /** Кисть виявлено в кадрі */
  handPresent: boolean
  /**
   * Додаткова умова переходу в «Утримання»: I_k ≥ I_min,k для ізольованих рухів
   * або «d_k заданого пальця — найменша» для протиставлення. Відсутня — умова виконана.
   */
  isolationOk?: boolean
  /** Значення керуючого показника x (ненормоване) — для амплітуди A_m */
  x?: number
  /** Φ_j усіх пальців — для ізольованості I_k */
  Phi?: Record<Finger, number>
}

/** Запис одного повторення */
export interface RepetitionRecord {
  /** t_m^s — початок повторення, с */
  ts: number
  /** t_m — перше досягнення цілі, с; null для невдалої спроби без досягнення цілі */
  tm: number | null
  /** t_m^e — завершення повторення, с */
  te: number
  /** Результат спроби */
  success: boolean
  /** Рівень складності, на якому виконано спробу */
  level: number
  /** Пороги, що діяли під час спроби */
  thresholds: LevelThresholds
  /** Час утримання цільового положення (від останнього входу в «Утримання»), с */
  holdTime: number
  /** Часові мітки кадрів повторення, с */
  t: number[]
  /** Значення керуючого показника за кадрами (для A_m) */
  x: number[]
  /** Значення u за кадрами */
  u: number[]
  /** Φ_j усіх пальців за кадрами (для I_k); null, якщо не передавалися */
  Phi: Record<Finger, number[]> | null
  /** Перед цим повторенням (після попереднього) була пауза через втрату кисті */
  pausedBefore: boolean
}

export type FsmEvent =
  | { type: 'moveStart'; t: number }
  | { type: 'goalReached'; t: number }
  | { type: 'goalLost'; t: number }
  | { type: 'success'; t: number }
  | { type: 'fail'; t: number }
  | { type: 'repetitionEnd'; t: number; record: RepetitionRecord }
  | { type: 'paused'; t: number }
  | { type: 'resumed'; t: number }

export type FsmEventType = FsmEvent['type']

/**
 * Автомат вправи.
 *
 * Переходи:
 * - Waiting → Moving: u > θ_r (момент t_s);
 * - Moving → Holding: u ≥ θ_g і додаткова умова (момент t_m);
 * - Holding → Moving: u < θ_g − h (гістерезис);
 * - Holding, τ ≥ t_h: успіх → Returning;
 * - Moving, t − t_s ≥ T_max: невдача → Returning;
 * - Returning → Waiting: u ≤ θ_r (момент t_e), повторення завершене;
 * - кисті немає довше t_lost: → Paused, поточна спроба скасовується; кисть повернулася → Waiting.
 */
export class ExerciseFsm {
  private _state: FsmState = 'Waiting'
  private lostSince: number | null = null
  private pauseFlag = false
  private current: RepetitionRecord | null = null
  private holdStart: number | null = null
  private holding = false
  private readonly _records: RepetitionRecord[] = []

  /**
   * @param params θ_r, h, t_lost
   * @param thresholds пороги поточного рівня (θ_g, t_h, T_max); фіксуються на початку спроби
   */
  constructor(
    private readonly params: FsmParams,
    private readonly thresholds: () => LevelThresholds,
  ) {}

  get state(): FsmState {
    return this._state
  }

  /** Завершені повторення */
  get records(): readonly RepetitionRecord[] {
    return this._records
  }

  /** Поточна (незавершена) спроба */
  get attempt(): Readonly<RepetitionRecord> | null {
    return this.current
  }

  /** Поточний час утримання τ, с */
  holdTau(t: number): number {
    return this._state === 'Holding' && this.holdStart !== null ? t - this.holdStart : 0
  }

  /** Обробка кадру; повертає події, що сталися на цьому кадрі */
  step(input: FsmInput): FsmEvent[] {
    const events: FsmEvent[] = []
    const { t } = input

    if (!input.handPresent) {
      this.lostSince ??= t
      if (this._state !== 'Paused' && t - this.lostSince >= this.params.tLost) {
        this.cancelAttempt()
        this._state = 'Paused'
        this.pauseFlag = true
        events.push({ type: 'paused', t })
      }
      // короткі пропуски не оновлюють стан
      return events
    }
    this.lostSince = null

    if (this._state === 'Paused') {
      this._state = 'Waiting'
      events.push({ type: 'resumed', t })
      return events
    }

    const { u } = input
    const { thetaR, hysteresis: h } = this.params

    if (this.current) this.sample(this.current, input)

    switch (this._state) {
      case 'Waiting': {
        if (u > thetaR) {
          this.current = this.newRecord(input)
          this._state = 'Moving'
          events.push({ type: 'moveStart', t })
        }
        break
      }
      case 'Moving': {
        const rec = this.current as RepetitionRecord
        const th = rec.thresholds
        if (u >= th.thetaG && input.isolationOk !== false) {
          this._state = 'Holding'
          this.holdStart = t
          this.holding = true
          rec.tm ??= t
          events.push({ type: 'goalReached', t })
          // t_h = 0: утримання не потрібне
          if (th.tHold <= 0) this.finishAttempt(true, t, events)
        } else if (t - rec.ts >= th.tMax) {
          this.finishAttempt(false, t, events)
        }
        break
      }
      case 'Holding': {
        const rec = this.current as RepetitionRecord
        const th = rec.thresholds
        if (u < th.thetaG - h) {
          rec.holdTime = t - (this.holdStart as number)
          this.holding = false
          this.holdStart = null
          this._state = 'Moving'
          events.push({ type: 'goalLost', t })
          if (t - rec.ts >= th.tMax) this.finishAttempt(false, t, events)
        } else if (t - (this.holdStart as number) >= th.tHold) {
          this.finishAttempt(true, t, events)
        }
        break
      }
      case 'Returning': {
        const rec = this.current as RepetitionRecord
        // утримання триває й після зарахування, доки u не вийде за гістерезис
        if (this.holding && u < rec.thresholds.thetaG - h) this.stopHolding(t)
        if (u <= thetaR) {
          if (this.holding) this.stopHolding(t)
          rec.te = t
          this._records.push(rec)
          this.current = null
          this._state = 'Waiting'
          events.push({ type: 'repetitionEnd', t, record: rec })
        }
        break
      }
    }
    return events
  }

  /**
   * Негайна невдача поточної спроби (Moving/Holding → Returning), напр. натиснуто не ту цифру.
   * @returns події кадру (fail), порожньо, якщо спроби немає
   */
  forceFail(t: number): FsmEvent[] {
    if (!this.current || (this._state !== 'Moving' && this._state !== 'Holding')) return []
    const events: FsmEvent[] = []
    this.finishAttempt(false, t, events)
    return events
  }

  /** Скасування поточної спроби (пауза або вихід із вправи) */
  cancelAttempt(): void {
    this.current = null
    this.holdStart = null
    this.holding = false
    if (this._state !== 'Paused') this._state = 'Waiting'
  }

  private stopHolding(t: number) {
    const rec = this.current as RepetitionRecord
    if (this.holdStart !== null) rec.holdTime = t - this.holdStart
    this.holding = false
    this.holdStart = null
  }

  private finishAttempt(success: boolean, t: number, events: FsmEvent[]) {
    const rec = this.current as RepetitionRecord
    rec.success = success
    if (this.holdStart !== null) rec.holdTime = t - this.holdStart
    if (!success) {
      this.holding = false
      this.holdStart = null
    }
    this._state = 'Returning'
    events.push({ type: success ? 'success' : 'fail', t })
  }

  private newRecord(input: FsmInput): RepetitionRecord {
    const th = this.thresholds()
    const rec: RepetitionRecord = {
      ts: input.t,
      tm: null,
      te: input.t,
      success: false,
      level: th.level,
      thresholds: { ...th },
      holdTime: 0,
      t: [],
      x: [],
      u: [],
      Phi: input.Phi ? { 1: [], 2: [], 3: [], 4: [], 5: [] } : null,
      pausedBefore: this.pauseFlag,
    }
    this.pauseFlag = false
    this.sample(rec, input)
    return rec
  }

  private sample(rec: RepetitionRecord, input: FsmInput) {
    rec.t.push(input.t)
    rec.u.push(input.u)
    if (input.x !== undefined) rec.x.push(input.x)
    if (rec.Phi && input.Phi) {
      for (const k of [1, 2, 3, 4, 5] as Finger[]) rec.Phi[k].push(input.Phi[k])
    }
  }
}
