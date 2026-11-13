/**
 * Резервний режим розпізнавання: кадри передаються на сервер через WebSocket,
 * сервер повертає 21 ключову точку. Протокол — docs/protocol-landmarks-ws.md.
 *
 * Кадри не зберігаються на клієнті; у дорозі одночасно не більше одного кадру.
 */
import { DEFAULT_TRACKING_CONFIG, type TrackingConfig } from '@/config/tracking'

/** Розмір заголовка бінарного повідомлення з кадром, байт */
export const FRAME_HEADER_BYTES = 16

/** Відповідь сервера на кадр */
export interface RemoteLandmarksResult {
  seq: number
  /** Часова мітка, яку клієнт надіслав разом із кадром (performance.now(), мс) */
  timestamp: number
  /** Мітка руки MediaPipe як є (без виправлення дзеркалення) */
  handedness: 'Left' | 'Right' | null
  landmarks: [number, number, number][] | null
}

export interface RemoteError {
  type: 'error'
  code: string
  message: string
}

/** Адреса WebSocket: VITE_WS_BASE_URL або поточний хост (https → wss) */
export function buildLandmarksSocketUrl(path = DEFAULT_TRACKING_CONFIG.remote.path): string {
  const base = import.meta.env.VITE_WS_BASE_URL as string | undefined
  if (base) return base.replace(/\/$/, '') + path
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${proto}//${window.location.host}${path}`
}

/**
 * Передавання маркера доступу при встановленні з'єднання.
 * Єдине місце, яке треба змінити, коли бекенд визначиться зі способом (query-параметр
 * або перше повідомлення). Зараз — перше текстове повідомлення `{type:"auth", token}`,
 * щоб маркер не потрапляв у журнали запитів.
 */
export function authenticateSocket(ws: WebSocket, token: string | null): void {
  ws.send(JSON.stringify({ type: 'auth', token }))
}

/** Заголовок кадру: u32 seq, f64 timestamp, u16 width, u16 height (little-endian) */
export function encodeFrameHeader(seq: number, timestamp: number, width: number, height: number): ArrayBuffer {
  const buf = new ArrayBuffer(FRAME_HEADER_BYTES)
  const view = new DataView(buf)
  view.setUint32(0, seq >>> 0, true)
  view.setFloat64(4, timestamp, true)
  view.setUint16(12, width, true)
  view.setUint16(14, height, true)
  return buf
}

export function decodeFrameHeader(buf: ArrayBuffer): { seq: number; timestamp: number; width: number; height: number } {
  const view = new DataView(buf)
  return {
    seq: view.getUint32(0, true),
    timestamp: view.getFloat64(4, true),
    width: view.getUint16(12, true),
    height: view.getUint16(14, true),
  }
}

/** Розмір зменшеного кадру за короткою стороною */
export function scaledSize(w: number, h: number, shortSide: number): { width: number; height: number } {
  const k = Math.min(1, shortSide / Math.min(w, h))
  return { width: Math.max(1, Math.round(w * k)), height: Math.max(1, Math.round(h * k)) }
}

export type SocketStatus = 'idle' | 'connecting' | 'open' | 'closed' | 'error'

export class LandmarksSocket {
  status: SocketStatus = 'idle'
  /** Відповідь на кадр */
  onResult: (r: RemoteLandmarksResult) => void = () => {}
  /** Зміна стану з'єднання або помилка сервера */
  onStatus: (status: SocketStatus, message?: string) => void = () => {}

  private ws: WebSocket | null = null
  private seq = 0
  private inFlight: { seq: number; sentAt: number } | null = null
  private canvas: HTMLCanvasElement | null = null
  private readonly cfg: TrackingConfig['remote']

  constructor(cfg: Partial<TrackingConfig['remote']> = {}) {
    this.cfg = { ...DEFAULT_TRACKING_CONFIG.remote, ...cfg }
  }

  /** Встановлення з'єднання і передавання маркера доступу */
  connect(token: string | null, url = buildLandmarksSocketUrl(this.cfg.path)): Promise<void> {
    this.close()
    this.setStatus('connecting')
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(url)
      ws.binaryType = 'arraybuffer'
      this.ws = ws
      ws.onopen = () => {
        authenticateSocket(ws, token)
        this.setStatus('open')
        resolve()
      }
      ws.onerror = () => {
        this.setStatus('error', "Не вдалося з'єднатися з сервером розпізнавання.")
        reject(new Error('websocket-error'))
      }
      ws.onclose = () => {
        this.inFlight = null
        if (this.ws === ws) this.setStatus('closed')
      }
      ws.onmessage = (ev) => this.handleMessage(ev.data)
    })
  }

  /** Чи можна надіслати наступний кадр (з'єднання відкрите і попередній кадр не в дорозі) */
  get ready(): boolean {
    if (this.inFlight && performance.now() - this.inFlight.sentAt > this.cfg.responseTimeoutMs) {
      // відповідь не прийшла — кадр вважається втраченим
      this.inFlight = null
    }
    return this.status === 'open' && this.inFlight === null
  }

  /**
   * Зменшення, стиснення і надсилання кадру.
   * @param source відео або інше джерело кадру
   * @param timestamp момент захоплення (performance.now(), мс) — сервер поверне його у відповіді
   * @returns false, якщо попередній кадр ще в дорозі або з'єднання не відкрите
   */
  sendFrame(source: HTMLVideoElement, timestamp: number): boolean {
    if (!this.ready || !this.ws) return false
    const w = source.videoWidth
    const h = source.videoHeight
    if (!w || !h) return false
    const seq = ++this.seq
    this.inFlight = { seq, sentAt: performance.now() }

    const size = scaledSize(w, h, this.cfg.shortSide)
    this.canvas ??= document.createElement('canvas')
    const canvas = this.canvas
    canvas.width = size.width
    canvas.height = size.height
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      this.inFlight = null
      return false
    }
    // кадр без дзеркалення, як і для локальної моделі
    ctx.drawImage(source, 0, 0, size.width, size.height)
    canvas.toBlob(
      (blob) => {
        const ws = this.ws
        if (!blob || !ws || ws.readyState !== WebSocket.OPEN || this.inFlight?.seq !== seq) {
          if (this.inFlight?.seq === seq) this.inFlight = null
          return
        }
        ws.send(new Blob([encodeFrameHeader(seq, timestamp, w, h), blob]))
      },
      this.cfg.mimeType,
      this.cfg.quality,
    )
    return true
  }

  close(): void {
    const ws = this.ws
    this.ws = null
    this.inFlight = null
    if (ws && ws.readyState <= WebSocket.OPEN) ws.close()
    this.setStatus('idle')
  }

  private handleMessage(data: unknown) {
    if (typeof data !== 'string') return
    let msg: RemoteLandmarksResult | RemoteError
    try {
      msg = JSON.parse(data)
    } catch {
      return
    }
    if ('type' in msg && msg.type === 'error') {
      this.onStatus('error', msg.message)
      return
    }
    const result = msg as RemoteLandmarksResult
    if (this.inFlight?.seq === result.seq) this.inFlight = null
    this.onResult(result)
  }

  private setStatus(status: SocketStatus, message?: string) {
    this.status = status
    this.onStatus(status, message)
  }
}
