/**
 * Опис чотирьох ігрових вправ (табл. 2.1 роботи): керуючий показник, напрям, додаткова умова.
 */
import { DEFAULT_MODEL_CONFIG, type DeepPartial, type Finger, type MetricKind, type ModelConfig, type OpposedFinger } from '@/model/config'
import type { MetricDirection } from '@/model/calibration'
import type { FrameMetrics } from '@/model/metrics'
import type { ControlMetric, ExerciseId, ExerciseSettings } from '@/types/exercise'

export interface ExerciseDefinition {
  id: ExerciseId
  /** Назва вправи і гри для пацієнта */
  title: string
  gameTitle: string
  /** Коротка інструкція великим шрифтом */
  instruction: string
  /** Рід керуючого показника і напрям його зміни під час руху */
  kind: MetricKind
  direction: MetricDirection
  /** Пальці, які може задавати гра (null — без заданого пальця) */
  targets: Finger[] | null
  /** Палець за замовчуванням */
  defaultTarget: Finger | null
  /** Керуючий показник для заданого пальця */
  metric(target: Finger | null): ControlMetric
  /**
   * Спосіб керування: 'pointer' — вказування прямим пальцем і натискання наближенням до камери;
   * 'position' — положення долоні, а повторення зараховує гра (відбитий / пропущений м'яч)
   */
  control?: 'pointer' | 'position'
  /** Параметри моделі, що відрізняються для цієї вправи (мають пріоритет над налаштуваннями) */
  config?: DeepPartial<ModelConfig>
}

/** Значення керуючого показника в кадрі */
export function metricValue(m: FrameMetrics, metric: ControlMetric): number {
  switch (metric) {
    case 'O':
      return m.O
    case 'Z':
    case 'X':
      // Z залежить від базової відстані s₀ (стан рушія), X — від розміру кадру; обчислює рушій
      return 0
    case 'd2':
    case 'd3':
    case 'd4':
    case 'd5':
      return m.d[Number(metric[1]) as OpposedFinger]
    default:
      return m.Phi[Number(metric[3]) as Finger]
  }
}

/** Рід і напрям показника */
export function metricInfo(metric: ControlMetric): { kind: MetricKind; direction: MetricDirection } {
  if (metric === 'O') return { kind: 'openness', direction: 'increasing' }
  if (metric === 'Z') return { kind: 'depth', direction: 'increasing' }
  if (metric === 'X') return { kind: 'position', direction: 'increasing' }
  if (metric.startsWith('d')) return { kind: 'distance', direction: 'decreasing' }
  return { kind: 'flexion', direction: 'increasing' }
}

/** Назви пальців у родовому відмінку («торкніться …») і називному */
export const FINGER_NAMES: Record<Finger, string> = {
  1: 'великий',
  2: 'вказівний',
  3: 'середній',
  4: 'безіменний',
  5: 'мізинець',
}

export const EXERCISES: Record<ExerciseId, ExerciseDefinition> = {
  pinch: {
    id: 'pinch',
    title: 'Щипковий захват',
    gameTitle: 'Город',
    instruction:
      'Зведіть кінчики великого і вказівного пальців, щоб узяти насінину. Тримайте захват і перенесіть її до грядки.',
    kind: 'distance',
    direction: 'decreasing',
    targets: null,
    defaultTarget: null,
    metric: () => 'd2',
  },
  opposition: {
    id: 'opposition',
    title: 'Протиставлення великого пальця',
    gameTitle: 'Кодовий замок',
    instruction: 'Торкніться великим пальцем кінчика пальця, що світиться. Правильна послідовність відкриє замок.',
    kind: 'distance',
    direction: 'decreasing',
    targets: [2, 3, 4, 5],
    defaultTarget: 2,
    metric: (k) => `d${(k ?? 2) as OpposedFinger}` as ControlMetric,
  },
  keypad: {
    id: 'keypad',
    title: 'Вказування прямим пальцем',
    gameTitle: 'Кодовий замок',
    instruction:
      'Випряміть вказівний палець (або будь-який інший) і наведіть його на цифру коду. Щоб натиснути цифру, наблизьте кисть до камери.',
    kind: 'depth',
    direction: 'increasing',
    targets: null,
    defaultTarget: null,
    metric: () => 'Z',
    control: 'pointer',
    config: {
      // «рух» починається з наближення на 35 % глибини натискання; натискання — повна глибина (u = 1),
      // коротке підтвердження 0,1 с; рівень змінює розмір робочої зони (гра)
      fsm: { thetaR: 0.35, hysteresis: 0.1 },
      levels: { thetaG1: 1, dTheta: 0, tHold1: 0.1, dTHold: 0 },
    },
  },
  openClose: {
    id: 'openClose',
    title: 'Розкриття і стискання кисті',
    gameTitle: 'Повітряна куля',
    instruction: 'Розкрийте долоню, щоб куля піднялася, і стисніть кулак, щоб вона опустилася. Пролітайте в проміжки.',
    kind: 'openness',
    direction: 'increasing',
    targets: null,
    defaultTarget: null,
    metric: () => 'O',
  },
  arkanoid: {
    id: 'arkanoid',
    title: 'Рух кисті ліворуч і праворуч',
    gameTitle: 'Арканоїд',
    instruction:
      'Рухайте кисть ліворуч і праворуч — ракетка повторює рух долоні. Відбивайте м\'яч і розбивайте цеглинки.',
    kind: 'position',
    direction: 'increasing',
    targets: null,
    defaultTarget: null,
    metric: () => 'X',
    control: 'position',
  },
  arkade2: {
    id: 'arkade2',
    title: 'Рух кисті ліворуч і праворуч',
    gameTitle: 'Арканоїд з бонусами',
    instruction:
      'Рухайте кисть ліворуч і праворуч — ракетка повторює рух долоні. Ловіть бонуси: великий м\'яч і кілька м\'ячів.',
    kind: 'position',
    direction: 'increasing',
    targets: null,
    defaultTarget: null,
    metric: () => 'X',
    control: 'position',
  },
  isolatedFinger: {
    id: 'isolatedFinger',
    title: 'Ізольовані рухи пальців',
    gameTitle: 'Піаніно',
    instruction: 'Зігніть лише палець, що світиться, щоб натиснути клавішу. Інші пальці тримайте нерухомо.',
    kind: 'flexion',
    direction: 'increasing',
    targets: [1, 2, 3, 4, 5],
    defaultTarget: 2,
    metric: (k) => `Phi${k ?? 2}` as ControlMetric,
  },
}

/**
 * Вправи, що є в застосунку (з іграми). «Протиставлення великого пальця» (opposition) та
 * «Ізольовані рухи пальців» (isolatedFinger) лишаються в описі моделі й тестах рушія, але ігор для них зараз немає.
 */
export const EXERCISE_LIST: ExerciseDefinition[] = [
  EXERCISES.pinch,
  EXERCISES.keypad,
  EXERCISES.openClose,
  EXERCISES.arkanoid,
  EXERCISES.arkade2,
]

/** Керуючі показники вправи (для всіх можливих пальців) */
export function exerciseMetrics(def: ExerciseDefinition): ControlMetric[] {
  return def.targets ? def.targets.map((k) => def.metric(k)) : [def.metric(null)]
}

/** Типові налаштування, поки фахівець їх не змінив (або бекенд недоступний) */
export const DEFAULT_EXERCISE_SETTINGS: ExerciseSettings = {
  exercises: ['pinch', 'keypad', 'openClose', 'arkanoid', 'arkade2'],
  repetitionsPerSeries: 10,
  levels: { ...DEFAULT_MODEL_CONFIG.levels },
  isolationMin: { ...DEFAULT_MODEL_CONFIG.isolationMin },
  dxMin: { ...DEFAULT_MODEL_CONFIG.calibration.dxMin },
  targetFrequencyHz: 0.25,
}
