/**
 * Джерело ключових точок кисті (задача 1).
 *
 * Однаково віддає кадри з локального (MediaPipe Hand Landmarker, WASM) і серверного
 * (WebSocket, резервний режим) розпізнавання, тож подальша обробка не знає, звідки дані.
 * Моделі передається кадр без відображення; дзеркалиться лише зображення на екрані (CSS).
 */
import { getCurrentInstance, onUnmounted, readonly, ref, shallowRef, type Ref } from 'vue'
import { FilesetResolver, HandLandmarker, type HandLandmarkerResult } from '@mediapipe/tasks-vision'
import { DEFAULT_TRACKING_CONFIG, type TrackingConfig } from '@/config/tracking'
import { LandmarksSocket, type RemoteLandmarksResult } from '@/services/landmarks_socket'
import type { HandFrame, Handedness, Landmark, TrackingMode } from '@/types/landmarks'
import { FrameStats } from '@/utils/frameStats'
import { demoLandmarks, isDemoMode } from '@/dev/demoHand'

export interface HandLandmarksOptions {
  config?: Partial<TrackingConfig>
  /** Запитати вебкамеру, якщо у <video> ще немає потоку (типово true) */
  autoCamera?: boolean
}

type FrameListener = (frame: HandFrame) => void

// Модель завантажується один раз і використовується всіма сторінками
let landmarkerPromise: Promise<HandLandmarker> | null = null

function loadLandmarker(cfg: TrackingConfig): Promise<HandLandmarker> {
  landmarkerPromise ??= (async () => {
    const fileset = await FilesetResolver.forVisionTasks(cfg.wasmBaseUrl)
    const create = (delegate: 'GPU' | 'CPU') =>
      HandLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: cfg.modelAssetPath, delegate },
        runningMode: 'VIDEO',
        numHands: 1,
        minHandDetectionConfidence: cfg.minDetectionConfidence,
        minTrackingConfidence: cfg.minTrackingConfidence,
        minHandPresenceConfidence: cfg.minPresenceConfidence,
      })
    try {
      return await create(cfg.delegate)
    } catch (err) {
      if (cfg.delegate === 'CPU') throw err
      console.warn('GPU-делегат недоступний, використовується CPU', err)
      return create('CPU')
    }
  })().catch((err) => {
    landmarkerPromise = null
    throw err
  })
  return landmarkerPromise
}

function fixHandedness(label: string | undefined, invert: boolean): Handedness | null {
  if (label !== 'Left' && label !== 'Right') return null
  if (!invert) return label
  return label === 'Left' ? 'Right' : 'Left'
}

function describeCameraError(err: unknown): string {
  const name = (err as DOMException)?.name
  if (name === 'NotAllowedError') return 'Дозвіл на вебкамеру не надано. Дозвольте доступ у налаштуваннях браузера.'
  if (name === 'NotFoundError') return 'Вебкамеру не знайдено.'
  if (name === 'NotReadableError') return 'Вебкамера зайнята іншою програмою.'
  return 'Вебкамера недоступна.'
}

export function useHandLandmarks(videoRef: Readonly<Ref<HTMLVideoElement | null>>, options: HandLandmarksOptions = {}) {
  const cfg: TrackingConfig = {
    ...DEFAULT_TRACKING_CONFIG,
    ...options.config,
    remote: { ...DEFAULT_TRACKING_CONFIG.remote, ...options.config?.remote },
  }

  const mode = ref<TrackingMode>('local')
  const fps = ref(0)
  const detectionRate = ref(0)
  const lastFrame = shallowRef<HandFrame | null>(null)
  const error = ref<string | null>(null)
  const loading = ref(false)
  const running = ref(false)
  /** Частота нижча за мінімальну — слід запропонувати резервний режим */
  const lowFps = ref(false)

  const frameListeners = new Set<FrameListener>()
  const lowFpsListeners = new Set<() => void>()
  const stats = new FrameStats(cfg.fpsWindowS * 1000, cfg.minFps)

  let landmarker: HandLandmarker | null = null
  let socket: LandmarksSocket | null = null
  let ownStream: MediaStream | null = null
  let pumpId: number | null = null
  let isSending = false
  let lastVideoTime = -1
  let demoTimer: ReturnType<typeof setInterval> | null = null

  /** Підписка на кожен оброблений кадр; повертає функцію відписки */
  function onFrame(cb: FrameListener): () => void {
    frameListeners.add(cb)
    return () => frameListeners.delete(cb)
  }

  /** Подія lowFps: fps < minFps довше за інтервал усереднення (лише в локальному режимі) */
  function onLowFps(cb: () => void): () => void {
    lowFpsListeners.add(cb)
    return () => lowFpsListeners.delete(cb)
  }

  function emit(frame: HandFrame) {
    lastFrame.value = frame
    const fired = stats.push(frame.timestamp, frame.landmarks !== null)
    fps.value = stats.fps
    detectionRate.value = stats.detectionRate
    if (fired && mode.value === 'local') {
      lowFps.value = true
      lowFpsListeners.forEach((cb) => cb())
    }
    frameListeners.forEach((cb) => cb(frame))
  }

  function frameFromLocal(result: HandLandmarkerResult, video: HTMLVideoElement, t: number): HandFrame {
    const pts = result.landmarks[0]
    return {
      landmarks: pts ? pts.map((p): Landmark => ({ x: p.x, y: p.y, z: p.z })) : null,
      handedness: pts ? fixHandedness(result.handedness[0]?.[0]?.categoryName, cfg.invertHandedness) : null,
      width: video.videoWidth,
      height: video.videoHeight,
      timestamp: t,
      source: 'local',
    }
  }

  function frameFromRemote(r: RemoteLandmarksResult): HandFrame {
    const video = videoRef.value
    const has = Array.isArray(r.landmarks) && r.landmarks.length === 21
    return {
      landmarks: has ? r.landmarks!.map(([x, y, z]) => ({ x, y, z })) : null,
      handedness: has ? fixHandedness(r.handedness ?? undefined, cfg.invertHandedness) : null,
      width: video?.videoWidth ?? 0,
      height: video?.videoHeight ?? 0,
      timestamp: r.timestamp,
      source: 'remote',
    }
  }

  async function ensureCamera(video: HTMLVideoElement): Promise<boolean> {
    if (video.srcObject) {
      if (video.paused) await video.play().catch(() => {})
      return true
    }
    if (options.autoCamera === false) return false
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('not-supported')
      ownStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: cfg.cameraWidth }, height: { ideal: cfg.cameraHeight }, facingMode: 'user' },
        audio: false,
      })
      video.srcObject = ownStream
      await video.play().catch(() => {})
      return true
    } catch (err) {
      error.value = describeCameraError(err)
      return false
    }
  }

  // Цикл передавання кадрів (розділ 3, лістинг «Цикл передавання кадрів»):
  // кадри подаються в циклі requestAnimationFrame; поки модель зайнята, кадр пропускається
  const pump = async () => {
    pumpId = requestAnimationFrame(pump)
    const video = videoRef.value
    if (isSending || !video) return
    if (video.readyState < 2) return
    // той самий кадр відео вже оброблено (rAF частіший за камеру)
    if (video.currentTime === lastVideoTime) return
    lastVideoTime = video.currentTime
    const t = performance.now()

    if (mode.value === 'remote') {
      socket?.sendFrame(video, t)
      return
    }
    if (!landmarker) return
    isSending = true
    try {
      const result = landmarker.detectForVideo(video, t)
      emit(frameFromLocal(result, video, t))
    } catch (err) {
      console.error(err)
    } finally {
      isSending = false
    }
  }

  async function start(): Promise<boolean> {
    if (running.value) return true
    if (isDemoMode()) {
      // dev: синтетична кисть замість вебкамери і моделі
      const t0 = performance.now()
      demoTimer = setInterval(() => {
        const t = performance.now()
        emit({
          landmarks: demoLandmarks((t - t0) / 1000, 1280, 720),
          handedness: 'Right',
          width: 1280,
          height: 720,
          timestamp: t,
          source: 'local',
        })
      }, 33)
      running.value = true
      return true
    }
    const video = videoRef.value
    if (!video) return false
    error.value = null
    loading.value = true
    try {
      if (!(await ensureCamera(video))) return false
      if (mode.value === 'local') {
        try {
          landmarker = await loadLandmarker(cfg)
        } catch (err) {
          console.error(err)
          error.value = 'Не вдалося завантажити модель розпізнавання кисті. Перевірте підключення до інтернету.'
          return false
        }
      }
      stats.reset()
      lastVideoTime = -1
      running.value = true
      void pump()
      return true
    } finally {
      loading.value = false
    }
  }

  function stop(): void {
    if (demoTimer !== null) clearInterval(demoTimer)
    demoTimer = null
    if (pumpId !== null) cancelAnimationFrame(pumpId)
    pumpId = null
    running.value = false
    isSending = false
    socket?.close()
    socket = null
    if (ownStream) {
      ownStream.getTracks().forEach((t) => t.stop())
      if (videoRef.value?.srcObject === ownStream) videoRef.value.srcObject = null
      ownStream = null
    }
  }

  /**
   * Перемикання режиму. Перехід у резервний режим — лише після згоди користувача
   * (діалог в оболонці гри), не автоматично.
   */
  async function setMode(next: TrackingMode): Promise<boolean> {
    if (next === mode.value) return true
    error.value = null
    if (next === 'remote') {
      const s = new LandmarksSocket(cfg.remote)
      s.onResult = (r) => {
        if (mode.value === 'remote') emit(frameFromRemote(r))
      }
      s.onStatus = (status, message) => {
        if (status === 'error' && message) error.value = message
        if (status === 'closed' && mode.value === 'remote') {
          error.value = "З'єднання з сервером розпізнавання розірвано. Повернено локальний режим."
          void setMode('local')
        }
      }
      try {
        await s.connect(sessionStorage.getItem('token'))
      } catch {
        s.close()
        return false
      }
      socket = s
      mode.value = 'remote'
    } else {
      socket?.close()
      socket = null
      try {
        landmarker = await loadLandmarker(cfg)
      } catch {
        error.value = 'Не вдалося завантажити модель розпізнавання кисті.'
        return false
      }
      mode.value = 'local'
    }
    stats.reset()
    lowFps.value = false
    return true
  }

  if (getCurrentInstance()) onUnmounted(stop)

  return {
    start,
    stop,
    setMode,
    onFrame,
    onLowFps,
    mode: readonly(mode),
    fps: readonly(fps),
    detectionRate: readonly(detectionRate),
    lastFrame,
    error,
    loading: readonly(loading),
    running: readonly(running),
    lowFps,
    config: cfg,
  }
}

export type HandLandmarksSource = ReturnType<typeof useHandLandmarks>
