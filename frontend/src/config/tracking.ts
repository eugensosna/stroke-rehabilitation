/**
 * Параметри джерела ключових точок (задача 1). Підбираються експериментально в розділі 3,
 * тому зібрані в одному об'єкті з типовими значеннями.
 */

/** Закріплена версія @mediapipe/tasks-vision — має збігатися з package.json */
export const TASKS_VISION_VERSION = '0.10.35'

export interface TrackingConfig {
  /** Каталог WASM-файлів MediaPipe Tasks Vision (закріплена версія) */
  wasmBaseUrl: string
  /** Модель Hand Landmarker (закріплена версія float16/1) */
  modelAssetPath: string
  /** Делегат обчислень моделі */
  delegate: 'GPU' | 'CPU'
  /** Мінімальна впевненість виявлення і відстеження кисті */
  minDetectionConfidence: number
  minTrackingConfidence: number
  minPresenceConfidence: number
  /**
   * MediaPipe визначає руку, вважаючи вхідний кадр дзеркальним (фронтальна камера).
   * Ми передаємо кадр без відображення, тому мітку треба поміняти, щоб права рука пацієнта була `Right`.
   */
  invertHandedness: boolean
  /** Інтервал усереднення частоти обробки і частки кадрів з кистю, с */
  fpsWindowS: number
  /** Мінімальна частота обробки, кадр/с; нижче протягом інтервалу усереднення — подія lowFps */
  minFps: number
  /** Роздільна здатність, яку запитуємо у вебкамери */
  cameraWidth: number
  cameraHeight: number
  remote: {
    /** Шлях WebSocket на сервері застосунку */
    path: string
    /** Коротка сторона кадру після зменшення, пікс. */
    shortSide: number
    /** Формат стиснення кадру */
    mimeType: 'image/webp' | 'image/jpeg'
    /** Якість стиснення 0..1 */
    quality: number
    /** Тайм-аут очікування відповіді на кадр, мс (після нього кадр вважається втраченим) */
    responseTimeoutMs: number
  }
}

export const DEFAULT_TRACKING_CONFIG: TrackingConfig = {
  wasmBaseUrl: `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${TASKS_VISION_VERSION}/wasm`,
  modelAssetPath:
    'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
  delegate: 'GPU',
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5,
  minPresenceConfidence: 0.5,
  invertHandedness: true,
  fpsWindowS: 2,
  minFps: 25,
  cameraWidth: 1280,
  cameraHeight: 720,
  remote: {
    path: '/ws/landmarks',
    shortSide: 256,
    mimeType: 'image/webp',
    quality: 0.7,
    responseTimeoutMs: 2000,
  },
}
