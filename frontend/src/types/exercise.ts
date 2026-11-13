/**
 * Типи вправ, калібрування і звітів серії (задача 3). Контракт API — docs/api-exercise.md.
 * На сервер передаються лише числові показники, без координат ключових точок і зображень.
 */
import type { Finger, LevelParams, MetricKind } from '@/model/config'
import type { TrackingMode } from './landmarks'

/** Вправи з табл. 2.1 роботи */
export type ExerciseId = 'pinch' | 'opposition' | 'keypad' | 'openClose' | 'isolatedFinger'

/**
 * Керуючі показники: d_2..d_5 (частки s), O (частки s), Φ_1..Φ_5 (рад у моделі, градуси у звітах),
 * Z — наближення кисті до камери, частка початкової відстані: Z = 1 − s₀/s.
 */
export type ControlMetric = 'd2' | 'd3' | 'd4' | 'd5' | 'O' | 'Phi1' | 'Phi2' | 'Phi3' | 'Phi4' | 'Phi5' | 'Z'

/** Діапазон калібрування в одиницях моделі (радіани для кутів, частки s для відстаней) */
export interface StoredRange {
  xr: number
  xg: number
  unavailable: boolean
}

export type CalibrationRanges = Partial<Record<ControlMetric, StoredRange>>

/** Результат калібрування, що зберігається на сервері */
export interface CalibrationRecord {
  id?: number
  /** ISO-8601 */
  createdAt: string
  /** Повне чи скорочене калібрування */
  kind: 'full' | 'short'
  /** Діапазони керуючих показників, одиниці моделі */
  ranges: CalibrationRanges
}

/** Налаштування вправ пацієнта, які задає фахівець з реабілітації */
export interface ExerciseSettings {
  /** Призначені вправи */
  exercises: ExerciseId[]
  /** Кількість повторень у серії */
  repetitionsPerSeries: number
  /** Межі рівнів і кроки параметрів */
  levels: LevelParams
  /** I_min,k для кожного пальця */
  isolationMin: Record<Finger, number>
  /** Δx_min за родом показника (частки s; радіани для кутів) */
  dxMin: Record<MetricKind, number>
  /** Бажана частота повторень для вправи «Повітряна куля», Гц */
  targetFrequencyHz: number
}

/** Деталізація одного повторення (без координат ключових точок) */
export interface RepetitionReport {
  index: number
  /** Заданий палець (для протиставлення та ізольованих рухів) */
  target: Finger | null
  /** Керуючий показник повторення */
  metric: ControlMetric
  /** Моменти t_s, t_m, t_e відносно початку серії, с */
  startS: number
  goalS: number | null
  endS: number
  success: boolean
  level: number
  /** A_m у градусах (кути) або частках s (відстані) */
  amplitude: number | null
  /** Час утримання, с */
  holdTimeS: number
  /** I_k для ізольованих рухів */
  isolation: number | null
  /** Перед повторенням була пауза через втрату кисті */
  pausedBefore: boolean
  /**
   * Кути суглобів (градуси) у момент найбільшого u: для кожного пальця 1..5 —
   * МФС, ПМФС, ДМФС (для великого — МФС, МФ).
   */
  jointAnglesDeg: number[][] | null
}

/** Діапазон калібрування в одиницях звіту */
export interface ReportRange {
  metric: ControlMetric
  /** x_r, x_g — градуси для кутів, частки s для відстаней */
  xr: number
  xg: number
}

/** Звіт серії за табл. 2.2 роботи */
export interface SeriesReport {
  exerciseId: ExerciseId
  /** ISO-8601 початку серії */
  startedAt: string
  /** N, N_s */
  attempts: number
  successes: number
  /** N_s/N, % (null, якщо спроб не було) */
  successRatePct: number | null
  /** Ā, A_max — градуси або частки s */
  meanAmplitude: number | null
  maxAmplitude: number | null
  amplitudeUnit: 'deg' | 's' | 'depth'
  /** f, Гц; null при M < 3 */
  frequencyHz: number | null
  /** V, %; null при M < 3 */
  rhythmCvPct: number | null
  /** t̄_h, с */
  meanHoldTimeS: number | null
  /** Ī_k (лише для ізольованих рухів) */
  meanIsolation: number | null
  /** x_r, x_g керуючих показників */
  ranges: ReportRange[]
  /** L початковий і кінцевий */
  startLevel: number
  endLevel: number
  /** Тривалість активної роботи, хв */
  activeDurationMin: number
  /** Частка кадрів з кистю, % */
  detectionRatePct: number
  /** Режим обробки і середня частота обробки, кадр/с */
  trackingMode: TrackingMode
  meanFps: number
  repetitions: RepetitionReport[]
}

/** Збережена серія (відповідь сервера) */
export interface SeriesRecord extends SeriesReport {
  id: number
  savedAt: string
}
