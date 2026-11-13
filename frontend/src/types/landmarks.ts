/** Ключова точка кисті в нормованих координатах MediaPipe (x, y — 0..1 від ширини/висоти кадру) */
export interface Landmark {
  x: number
  y: number
  z: number
}

/** Режим розпізнавання: локально в браузері (WASM) або на сервері через WebSocket (резервний) */
export type TrackingMode = 'local' | 'remote'

export type Handedness = 'Left' | 'Right'

/**
 * Один оброблений кадр. Однаковий для локального і серверного розпізнавання,
 * тому подальша обробка не знає, звідки прийшли дані.
 */
export interface HandFrame {
  /** 21 точка в нормованих координатах кадру без дзеркалення; null — кисть не виявлено */
  landmarks: Landmark[] | null
  /** Ліва чи права рука пацієнта; null, якщо кисть не виявлено */
  handedness: Handedness | null
  /** W, H кадру в пікселях (для формули ізотропних координат) */
  width: number
  height: number
  /** performance.now() моменту захоплення кадру, мс */
  timestamp: number
  source: TrackingMode
}

/** Запис сеансу для експерименту (лише ключові точки, без зображень) */
export interface HandRecording {
  version: 1
  createdAt: string
  userAgent: string
  frames: HandFrame[]
}
