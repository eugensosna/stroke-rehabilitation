/**
 * Генератор синтетичної кисті (21 ключова точка у нормованих координатах MediaPipe)
 * з параметрами згинання пальців — для тестів моделі, рушія вправи і mock-сервера.
 *
 * Файл без залежностей, щоб його можна було запускати й у Node (scripts/mock-landmarks-ws.ts).
 */

export interface P3 {
  x: number
  y: number
  z: number
}

export type FingerNo = 1 | 2 | 3 | 4 | 5

export interface SyntheticHandParams {
  /** Ступінь згинання кожного пальця, 0 — випрямлений, 1 — максимально зігнутий */
  flex?: Partial<Record<FingerNo, number>>
  /** Наближення кінчика великого пальця до кінчика пальця k (0..1) */
  thumbTo?: { k: 2 | 3 | 4 | 5; amount: number }
  /** Положення зап'ястка в кадрі, нормовані координати */
  cx?: number
  cy?: number
  /** Масштаб s = ‖P9 − P0‖, пікс. */
  size?: number
  /** Ширина і висота кадру, пікс. */
  W?: number
  H?: number
  /** Поворот кисті в площині зображення, рад */
  rotation?: number
  /** Дзеркальне відображення по x */
  mirror?: boolean
  /** СКВ гаусового шуму, пікс. */
  noise?: number
  /** Генератор випадкових чисел 0..1 (для шуму) */
  rng?: () => number
}

/** Детермінований генератор псевдовипадкових чисел (mulberry32) */
export function seededRng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function gauss(rng: () => number): number {
  const u = Math.max(rng(), 1e-12)
  const v = rng()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

const add = (a: P3, b: P3): P3 => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z })
const mul = (a: P3, k: number): P3 => ({ x: a.x * k, y: a.y * k, z: a.z * k })
const lerp = (a: P3, b: P3, k: number): P3 => add(a, mul(add(b, mul(a, -1)), k))
const unit = (a: P3): P3 => mul(a, 1 / Math.hypot(a.x, a.y, a.z))

/** Напрям, повернутий на кут θ від base у бік bend (bend ⟂ base) */
const bendDir = (base: P3, bend: P3, theta: number): P3 =>
  add(mul(base, Math.cos(theta)), mul(bend, Math.sin(theta)))

// Геометрія в одиницях s; долоня до камери, пальці вгору (−y), згинання — до камери (−z)
const MCP: Record<2 | 3 | 4 | 5, P3> = {
  2: { x: -0.32, y: -0.95, z: 0 },
  3: { x: 0, y: -1, z: 0 },
  4: { x: 0.26, y: -0.93, z: 0 },
  5: { x: 0.48, y: -0.8, z: 0 },
}
const SEGMENTS: Record<2 | 3 | 4 | 5, [number, number, number]> = {
  2: [0.45, 0.27, 0.2],
  3: [0.5, 0.3, 0.22],
  4: [0.47, 0.28, 0.2],
  5: [0.37, 0.22, 0.18],
}
/** Максимальні кути МФС, ПМФС, ДМФС, рад */
const MAX_ANGLES: [number, number, number] = [(85 * Math.PI) / 180, (100 * Math.PI) / 180, (70 * Math.PI) / 180]
const THUMB_MAX: [number, number] = [(55 * Math.PI) / 180, (75 * Math.PI) / 180]
const TOWARD_CAMERA: P3 = { x: 0, y: 0, z: -1 }

/** 21 точка кисті в одиницях s з центром у зап'ясті (без проєкції на кадр) */
export function handGeometry(params: Pick<SyntheticHandParams, 'flex' | 'thumbTo'> = {}): P3[] {
  const flex = params.flex ?? {}
  const P: P3[] = new Array(21)
  P[0] = { x: 0, y: 0, z: 0 }

  for (const k of [2, 3, 4, 5] as const) {
    const f = Math.min(1, Math.max(0, flex[k] ?? 0))
    const mcp = MCP[k]
    const base = unit(mcp)
    let theta = 0
    let prev = mcp
    const m = 4 * k - 3
    P[m] = mcp
    SEGMENTS[k].forEach((len, j) => {
      theta += f * MAX_ANGLES[j]
      prev = add(prev, mul(bendDir(base, TOWARD_CAMERA, theta), len))
      P[m + 1 + j] = prev
    })
  }

  // великий палець: 1 — зап'ястно-п'ястковий, 2 — п'ястково-фаланговий, 3 — міжфаланговий, 4 — кінчик
  const ft = Math.min(1, Math.max(0, flex[1] ?? 0))
  P[1] = { x: -0.3, y: -0.3, z: 0 }
  const tBase = unit({ x: -0.55, y: -0.6, z: 0 })
  // згинання великого пальця — до долоні і до камери
  const tBendRaw = { x: 0.7, y: 0, z: -0.7 }
  const proj = tBendRaw.x * tBase.x + tBendRaw.y * tBase.y
  const tBend = unit(add(tBendRaw, mul(tBase, -proj)))
  P[2] = add(P[1], mul(tBase, 0.35))
  const th1 = ft * THUMB_MAX[0]
  P[3] = add(P[2], mul(bendDir(tBase, tBend, th1), 0.3))
  P[4] = add(P[3], mul(bendDir(tBase, tBend, th1 + ft * THUMB_MAX[1]), 0.25))

  if (params.thumbTo && params.thumbTo.amount > 0) {
    const a = Math.min(1, params.thumbTo.amount)
    const target = P[4 * params.thumbTo.k]
    const newTip = lerp(P[4], target, a)
    const mid = lerp(P[2], newTip, 0.55)
    P[3] = lerp(P[3], mid, a)
    P[4] = newTip
  }
  return P
}

/** Синтетичні ключові точки в нормованих координатах MediaPipe */
export function syntheticHand(params: SyntheticHandParams = {}): P3[] {
  const W = params.W ?? 640
  const H = params.H ?? 480
  const size = params.size ?? 120
  const cx = (params.cx ?? 0.5) * W
  const cy = (params.cy ?? 0.75) * H
  const rot = params.rotation ?? 0
  const c = Math.cos(rot)
  const s = Math.sin(rot)
  const noise = params.noise ?? 0
  const rng = params.rng ?? Math.random

  return handGeometry(params).map((p) => {
    let px = (p.x * c - p.y * s) * size + cx
    let py = (p.x * s + p.y * c) * size + cy
    let pz = p.z * size
    if (noise > 0) {
      px += gauss(rng) * noise
      py += gauss(rng) * noise
      pz += gauss(rng) * noise
    }
    const x = px / W
    return { x: params.mirror ? 1 - x : x, y: py / H, z: pz / W }
  })
}
