/**
 * Mock-сервер резервного режиму (docs/protocol-landmarks-ws.md) для розробки.
 *
 * Запуск:   npm run mock:ws -- [--port 8090] [--file запис.json] [--delay 40]
 * Фронтенд: VITE_WS_PROXY_TARGET=http://localhost:8090 npm run dev
 *
 * Без --file повертає синтетичну кисть, що по черзі розкривається/стискається і виконує щипок;
 * з --file — по колу кадри запису з режиму ?record=1. Зображення не зберігаються.
 */
import { readFileSync } from 'node:fs'
import { WebSocketServer, type RawData } from 'ws'
import { syntheticHand } from '../src/dev/syntheticHand.ts'

interface RecordedFrame {
  landmarks: { x: number; y: number; z: number }[] | null
  handedness: 'Left' | 'Right' | null
}

const args = process.argv.slice(2)
const arg = (name: string, fallback?: string) => {
  const i = args.indexOf(`--${name}`)
  return i >= 0 ? args[i + 1] : fallback
}
const port = Number(arg('port', '8090'))
const delay = Number(arg('delay', '30'))
const file = arg('file')

let recorded: RecordedFrame[] = []
if (file) {
  recorded = (JSON.parse(readFileSync(file, 'utf8')) as { frames: RecordedFrame[] }).frames
  console.log(`Завантажено запис: ${recorded.length} кадрів`)
}

const HEADER = 16
const decodeHeader = (buf: Buffer) => ({
  seq: buf.readUInt32LE(0),
  timestamp: buf.readDoubleLE(4),
  width: buf.readUInt16LE(12),
  height: buf.readUInt16LE(14),
})

// Клієнт виправляє мітку руки (MediaPipe вважає кадр дзеркальним), тож повертаємо «сиру» мітку
const rawLabel = (h: 'Left' | 'Right' | null) => (h === 'Left' ? 'Right' : h === 'Right' ? 'Left' : null)

let cursor = 0
function nextLandmarks(width: number, height: number) {
  if (recorded.length > 0) {
    const f = recorded[cursor++ % recorded.length]
    return {
      handedness: rawLabel(f.handedness),
      landmarks: f.landmarks ? f.landmarks.map((p) => [p.x, p.y, p.z]) : null,
    }
  }
  const t = performance.now() / 1000
  const phase = (Math.sin(t * 1.2) + 1) / 2
  const cycle = Math.floor(t / 10) % 2
  const pts = syntheticHand({
    W: width || 640,
    H: height || 480,
    size: Math.min(width || 640, height || 480) * 0.22,
    cx: 0.5 + 0.15 * Math.sin(t * 0.4),
    cy: 0.72,
    flex: cycle === 0 ? { 1: phase, 2: phase, 3: phase, 4: phase, 5: phase } : {},
    thumbTo: cycle === 1 ? { k: 2, amount: phase } : undefined,
    noise: 0.8,
  })
  return { handedness: 'Left' as const, landmarks: pts.map((p) => [p.x, p.y, p.z]) }
}

const wss = new WebSocketServer({ port, path: '/ws/landmarks' })
wss.on('connection', (ws) => {
  let authed = false
  ws.on('message', (data: RawData, isBinary: boolean) => {
    if (!isBinary) {
      const msg = JSON.parse(data.toString()) as { type?: string; token?: string | null }
      if (msg.type === 'auth') {
        authed = true
        console.log(`Клієнт автентифікований (маркер ${msg.token ? 'є' : 'відсутній'})`)
      }
      return
    }
    if (!authed) {
      ws.send(JSON.stringify({ type: 'error', code: 'unauthorized', message: 'Потрібна автентифікація.' }))
      ws.close(4401)
      return
    }
    const buf = Buffer.isBuffer(data) ? data : Buffer.from(data as ArrayBuffer)
    if (buf.length < HEADER) return
    const h = decodeHeader(buf)
    setTimeout(() => {
      ws.send(JSON.stringify({ seq: h.seq, timestamp: h.timestamp, ...nextLandmarks(h.width, h.height) }))
    }, delay)
  })
})
console.log(`Mock WebSocket: ws://localhost:${port}/ws/landmarks (затримка ${delay} мс)`)
