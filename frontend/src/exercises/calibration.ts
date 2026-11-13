/**
 * Кроки калібрування (підрозділ «Калібрування показників під кисть пацієнта») і обчислення діапазонів.
 * Без Vue: кроки, запис показників і розрахунок x_r, x_g тестуються окремо.
 */
import { calibrateRange, extendRange } from '@/model/calibration'
import type { CalibrationParams } from '@/model/config'
import type { FrameMetrics } from '@/model/metrics'
import type { CalibrationRanges, ControlMetric, ExerciseId, StoredRange } from '@/types/exercise'
import { EXERCISE_LIST, EXERCISES, exerciseMetrics, metricInfo, metricValue } from './definitions'

export type CalibrationStepId =
  | 'rest'
  | 'openClose'
  | 'pinch'
  | 'touch3'
  | 'touch4'
  | 'touch5'
  | 'flex1'
  | 'flex2'
  | 'flex3'
  | 'flex4'
  | 'flex5'

export type CalibrationImage = 'rest' | 'openClose' | 'pinch' | 'touch' | 'flex'

export interface CalibrationStep {
  id: CalibrationStepId
  title: string
  /** Інструкція великим шрифтом */
  instruction: string
  /** Схема положення кисті (src/assets/calibration/<image>.svg) */
  image: CalibrationImage
  /** Номер пальця для схеми (підсвічування) */
  finger?: number
  /** Показники, діапазон яких визначає крок */
  metrics: ControlMetric[]
}

const FLEX_NAMES = ['великий', 'вказівний', 'середній', 'безіменний', 'мізинець']
const TOUCH_NAMES: Record<3 | 4 | 5, string> = { 3: 'середнього', 4: 'безіменного', 5: 'мізинця' }

export const CALIBRATION_STEPS: CalibrationStep[] = [
  {
    id: 'rest',
    title: 'Вихідне положення',
    instruction: 'Розслабте кисть і поверніть долоню до камери. Тримайте її нерухомо.',
    image: 'rest',
    metrics: [],
  },
  {
    id: 'openClose',
    title: 'Розкриття і кулак',
    instruction: 'Розкрийте долоню якнайширше, потім стисніть кулак. Повторюйте до кінця запису.',
    image: 'openClose',
    metrics: ['O'],
  },
  {
    id: 'pinch',
    title: 'Щипковий захват',
    instruction: 'Зведіть кінчики великого і вказівного пальців, потім розведіть. Повторюйте до кінця запису.',
    image: 'pinch',
    finger: 2,
    metrics: ['d2'],
  },
  ...([3, 4, 5] as const).map(
    (k): CalibrationStep => ({
      id: `touch${k}`,
      title: `Дотик до ${TOUCH_NAMES[k]}`,
      instruction: `Торкніться великим пальцем кінчика ${TOUCH_NAMES[k]} пальця, потім розведіть. Повторюйте до кінця запису.`,
      image: 'touch',
      finger: k,
      metrics: [`d${k}`],
    }),
  ),
  ...([1, 2, 3, 4, 5] as const).map(
    (k): CalibrationStep => ({
      id: `flex${k}`,
      title: `Згинання: ${FLEX_NAMES[k - 1]}`,
      instruction: `Зігніть якнайсильніше лише ${FLEX_NAMES[k - 1]}${k === 5 ? '' : ' палець'}, потім випряміть. Повторюйте до кінця запису.`,
      image: 'flex',
      finger: k,
      metrics: [`Phi${k}`],
    }),
  ),
]

/** Крок калібрування для показника (Z і X не калібруються) */
const STEP_BY_METRIC: Partial<Record<ControlMetric, CalibrationStepId>> = {
  O: 'openClose',
  d2: 'pinch',
  d3: 'touch3',
  d4: 'touch4',
  d5: 'touch5',
  Phi1: 'flex1',
  Phi2: 'flex2',
  Phi3: 'flex3',
  Phi4: 'flex4',
  Phi5: 'flex5',
}

/**
 * Кроки калібрування: повне — усі кроки; скорочене — вихідне положення і максимальний рух
 * для обраних вправ.
 */
export function calibrationSteps(kind: 'full' | 'short', exercises: ExerciseId[] = []): CalibrationStep[] {
  // повне — для всіх вправ застосунку
  const ids = kind === 'full' ? EXERCISE_LIST.map((e) => e.id) : exercises
  const needed = new Set<CalibrationStepId>(['rest'])
  for (const id of ids) {
    for (const m of exerciseMetrics(EXERCISES[id])) {
      const step = STEP_BY_METRIC[m]
      if (step) needed.add(step)
    }
  }
  return CALIBRATION_STEPS.filter((s) => needed.has(s.id))
}

/** Значення показників кадрів запису */
export function sampleMetrics(frames: readonly FrameMetrics[], metrics: readonly ControlMetric[]): Record<string, number[]> {
  const out: Record<string, number[]> = {}
  for (const m of metrics) out[m] = frames.map((f) => metricValue(f, m))
  return out
}

/**
 * Діапазон показника за записом кроку разом із записом вихідного положення
 * (5-й і 95-й процентилі; для спадних — навпаки).
 */
export function stepRange(
  metric: ControlMetric,
  restFrames: readonly FrameMetrics[],
  stepFrames: readonly FrameMetrics[],
  params: CalibrationParams,
): StoredRange | null {
  const { kind, direction } = metricInfo(metric)
  const values = [...restFrames, ...stepFrames].map((f) => metricValue(f, metric))
  return calibrateRange(values, direction, params.dxMin[kind], params.pLow, params.pHigh)
}

/**
 * Діапазони скороченого калібрування: нові діапазони розширюються до найбільших амплітуд
 * попереднього сеансу; показники, які не калібрувалися, беруться з попереднього калібрування.
 */
export function mergeShortCalibration(
  fresh: CalibrationRanges,
  previous: CalibrationRanges | null,
  previousAmplitudes: Partial<Record<ControlMetric, number>>,
  params: CalibrationParams,
): CalibrationRanges {
  const out: CalibrationRanges = { ...(previous ?? {}) }
  for (const [metric, range] of Object.entries(fresh) as [ControlMetric, StoredRange][]) {
    out[metric] = extendRange(range, previousAmplitudes[metric], params.dxMin[metricInfo(metric).kind])
  }
  return out
}

/** Вправи, доступні за калібруванням (принаймні один керуючий показник має достатній діапазон) */
export function availableExercises(ranges: CalibrationRanges): ExerciseId[] {
  return (Object.keys(EXERCISES) as ExerciseId[]).filter((id) =>
    exerciseMetrics(EXERCISES[id]).some((m) => !STEP_BY_METRIC[m] || (ranges[m] && !ranges[m]!.unavailable)),
  )
}

/**
 * Типові (усереднені) діапазони керуючих показників — використовуються, поки пацієнт не пройшов
 * калібрування (калібрування виконується лише на вимогу).
 *
 * x_r — розслаблена кисть, x_g — помірна мета, досяжна і при обмеженій рухливості:
 *  - d_k (відстань кінчиків / s): розслаблена кисть ≈ 0,8…1,7 (зі зростанням k), мета — наблизити
 *    кінчики приблизно до третини початкової відстані;
 *  - O (ступінь розкриття): кулак ≈ 0,8, розслаблена кисть ≈ 1,3…1,7, розкрита ≈ 1,8;
 *  - Φ_k (сумарне згинання, рад): розслаблений палець ≈ 0,5…0,9, кулак ≈ 4,5 (великий ≈ 2,3);
 *    мета ≈ 2 рад (≈ 115° сумарно у трьох суглобах), для великого — 1 рад.
 * Значення узгоджено з синтетичною кистю (src/dev/syntheticHand.ts); їх слід уточнити експериментально.
 */
export const DEFAULT_CALIBRATION_RANGES: Readonly<Record<ControlMetric, StoredRange>> = {
  d2: { xr: 0.8, xg: 0.3, unavailable: false },
  d3: { xr: 1.2, xg: 0.4, unavailable: false },
  d4: { xr: 1.45, xg: 0.5, unavailable: false },
  d5: { xr: 1.65, xg: 0.6, unavailable: false },
  O: { xr: 1.1, xg: 1.75, unavailable: false },
  Phi1: { xr: 0.3, xg: 1.0, unavailable: false },
  Phi2: { xr: 0.6, xg: 2.0, unavailable: false },
  Phi3: { xr: 0.6, xg: 2.0, unavailable: false },
  Phi4: { xr: 0.6, xg: 2.0, unavailable: false },
  Phi5: { xr: 0.6, xg: 2.0, unavailable: false },
  // натискання — наближення кисті до камери на 20 % відстані (видимий розмір зростає в 1/0,8 = 1,25 раза)
  Z: { xr: 0, xg: 0.2, unavailable: false },
  // ракетка: центр долоні від 25 % до 75 % ширини кадру проходить усе поле
  X: { xr: 0.25, xg: 0.75, unavailable: false },
}

/** Діапазони для вправи: власне калібрування пацієнта, а для показників без нього — типові значення */
export function effectiveRanges(calibrated: CalibrationRanges | null | undefined): CalibrationRanges {
  return { ...DEFAULT_CALIBRATION_RANGES, ...(calibrated ?? {}) }
}
