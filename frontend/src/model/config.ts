/**
 * Параметри моделі кінематичних показників (розділ 2 роботи).
 *
 * Усі числові параметри зібрано в одному об'єкті з типовими значеннями, бо їх
 * підбирають експериментально (розділ 3). Модуль не залежить від Vue і DOM.
 */

/** Номер пальця: 1 — великий, 2 — вказівний, 3 — середній, 4 — безіменний, 5 — мізинець */
export type Finger = 1 | 2 | 3 | 4 | 5
/** Пальці, до яких торкається великий палець (формула d_k) */
export type OpposedFinger = 2 | 3 | 4 | 5

export const FINGERS: readonly Finger[] = [1, 2, 3, 4, 5]
export const OPPOSED_FINGERS: readonly OpposedFinger[] = [2, 3, 4, 5]

/** Рід керуючого показника — визначає одиниці і типовий Δx_min */
export type MetricKind = 'distance' | 'openness' | 'flexion' | 'depth' | 'position'

/** Параметри фільтра 1€ (формули «Фільтрація координат») */
export interface OneEuroParams {
  /** f_c,min — мінімальна частота зрізу, Гц */
  fcMin: number
  /** β — зростання частоти зрізу зі швидкістю, 1/(пікс/с) для ізотропних координат */
  beta: number
  /** Фіксована частота зрізу для згладжування похідної, Гц */
  dCutoff: number
}

/** Параметри рівнів складності (формула θ_g(L), правило «два вгору — один вниз») */
export interface LevelParams {
  /** L_min, L_max — межі рівня */
  Lmin: number
  Lmax: number
  /** θ_g,1 — цільовий поріг першого рівня */
  thetaG1: number
  /** Δθ — крок цільового порога між рівнями */
  dTheta: number
  /** t_h на першому рівні, с, і крок Δt_h */
  tHold1: number
  dTHold: number
  /** T_max на першому рівні, с, і крок ΔT (T_max зменшується з рівнем) */
  tMax1: number
  dTMax: number
  /** Нижня межа T_max, с, щоб спроба не ставала нездійсненною */
  tMaxMin: number
}

/** Параметри скінченного автомата вправи */
export interface FsmParams {
  /** θ_r — поріг вихідного положення (частка діапазону) */
  thetaR: number
  /** h — ширина гістерезису біля θ_g */
  hysteresis: number
  /** t_lost — тривалість відсутності кисті до паузи, с */
  tLost: number
}

/** Параметри калібрування */
export interface CalibrationParams {
  /** Процентилі для x_r і x_g (для зростаючих показників; для спадних — навпаки) */
  pLow: number
  pHigh: number
  /** Δx_min — мінімально допустимий діапазон за родом показника (частки s або радіани) */
  dxMin: Record<MetricKind, number>
  /** Тривалість підготовки (відлік) і запису кроку, с */
  prepS: number
  recordS: number
}

/** Пороги підказок пацієнтові */
export interface HintParams {
  /** Кисті немає довше — підказка «кисть поза кадром», с */
  handLostHintS: number
  /**
   * Кисть ребром до камери: ширина долоні в площині зображення ‖P5 − P17‖_xy,
   * поділена на s, нижче порогу протягом edgeOnHoldS секунд.
   */
  palmWidthRatioMin: number
  edgeOnHoldS: number
  /** Ознаки втоми: порівнюються перші та останні fatigueWindow повторень серії */
  fatigueWindow: number
  /** Зниження частки успішних спроб (абсолютне, 0..1), що вважається помітним */
  fatigueSuccessDrop: number
  /** Відносне зниження середньої амплітуди (0..1), що вважається помітним */
  fatigueAmplitudeDrop: number
  /**
   * Розміщення кисті в кадрі (підказки «ближче / далі / праворуч…»).
   * Відстань від будь-якої ключової точки до краю кадру, нижче якої кисть вважається обрізаною
   * (частка сторони кадру).
   */
  edgeMargin: number
  /** Допустимі межі центру долоні по горизонталі та вертикалі (частка сторони кадру) */
  centerMin: number
  centerMax: number
  /** Межі s / min(W, H): менше — кисть задалеко, більше — заблизько */
  scaleMin: number
  scaleMax: number
  /** Скільки секунд проблема має триматися, щоб змінити підказку (проти мерехтіння) */
  placementHoldS: number
}

/** Вказування прямим пальцем (гра «Кодовий замок») */
export interface PointerParams {
  /** Палець вважається прямим, якщо сумарне згинання Φ_k менше за поріг, рад */
  straightMax: number
  /**
   * Стала часу ковзного середнього масштабу кисті s₀ (базова відстань до камери), с.
   * Повільне наближення кисті підтягує s₀ і не вважається натисканням.
   */
  baselineTau: number
}

export interface ModelConfig {
  filter: OneEuroParams
  fsm: FsmParams
  levels: LevelParams
  calibration: CalibrationParams
  /** I_min,k — мінімально допустима ізольованість для кожного пальця (підрозділ «Ізольованість») */
  isolationMin: Record<Finger, number>
  /**
   * Відношення ΔΦ_j/ΔΦ_k, за якого незадіяний палець вважається таким, що «зрушив»
   * (для підказки у вправі на ізольовані рухи).
   */
  movedFingerRatio: number
  /** ΔΦ_k, нижче якого рух заданого пальця вважається відсутнім (I_k = 0), рад */
  isolationEps: number
  hints: HintParams
  pointer: PointerParams
  /** Числовий нуль для довжин векторів (ізотропні пікселі) */
  eps: number
}

export const DEFAULT_MODEL_CONFIG: ModelConfig = {
  filter: { fcMin: 1.0, beta: 0.01, dCutoff: 1.0 },
  fsm: { thetaR: 0.2, hysteresis: 0.08, tLost: 1.0 },
  levels: {
    Lmin: 1,
    Lmax: 10,
    thetaG1: 0.5,
    dTheta: 0.05,
    tHold1: 0.5,
    dTHold: 0.15,
    tMax1: 8,
    dTMax: 0.5,
    tMaxMin: 2,
  },
  calibration: {
    pLow: 0.05,
    pHigh: 0.95,
    dxMin: { distance: 0.15, openness: 0.15, flexion: 0.35, depth: 0.03, position: 0.1 },
    prepS: 3,
    recordS: 5,
  },
  isolationMin: { 1: 0.6, 2: 0.6, 3: 0.4, 4: 0.4, 5: 0.5 },
  movedFingerRatio: 0.5,
  isolationEps: 0.05,
  hints: {
    handLostHintS: 0.3,
    palmWidthRatioMin: 0.3,
    edgeOnHoldS: 0.7,
    fatigueWindow: 5,
    fatigueSuccessDrop: 0.3,
    fatigueAmplitudeDrop: 0.25,
    edgeMargin: 0.02,
    centerMin: 0.15,
    centerMax: 0.85,
    scaleMin: 0.1,
    scaleMax: 0.38,
    placementHoldS: 0.5,
  },
  pointer: { straightMax: 0.6, baselineTau: 1.0 },
  eps: 1e-9,
}

/** Глибоке злиття часткових налаштувань з типовими значеннями */
export function mergeConfig(overrides: DeepPartial<ModelConfig> = {}): ModelConfig {
  return deepMerge(DEFAULT_MODEL_CONFIG, overrides) as ModelConfig
}

export type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] }

function deepMerge(base: unknown, over: unknown): unknown {
  if (over === undefined) return structuredClone(base)
  if (typeof base !== 'object' || base === null || typeof over !== 'object' || over === null) return over
  const out: Record<string, unknown> = { ...(structuredClone(base) as Record<string, unknown>) }
  for (const [key, value] of Object.entries(over)) {
    out[key] = deepMerge((base as Record<string, unknown>)[key], value)
  }
  return out
}
