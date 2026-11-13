import type { HandFrame } from '@/types/landmarks'

/** З'єднання ключових точок кисті MediaPipe (пари індексів) */
export const HAND_CONNECTIONS: readonly [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [0, 17], [17, 18], [18, 19], [19, 20],
]

export interface SkeletonStyle {
  /** Відображати дзеркально (як відео на екрані) */
  mirrored?: boolean
  /** Область полотна, у яку вписано кадр; типово — усе полотно */
  rect?: { x: number; y: number; width: number; height: number }
  lineColor?: string
  pointColor?: string
  /** Точки, які треба виділити (наприклад, кінчик заданого пальця) */
  highlight?: number[]
  highlightColor?: string
  lineWidth?: number
  radius?: number
}

/**
 * Скелет кисті поверх мініатюри камери.
 * Координати кадру — без дзеркалення; при `mirrored` x відображається, як і відео в CSS.
 */
export function drawHandSkeleton(ctx: CanvasRenderingContext2D, frame: HandFrame | null, style: SkeletonStyle = {}): void {
  const pts = frame?.landmarks
  if (!pts) return
  const rect = style.rect ?? { x: 0, y: 0, width: ctx.canvas.width, height: ctx.canvas.height }
  const px = (i: number) => {
    const nx = style.mirrored ? 1 - pts[i].x : pts[i].x
    return [rect.x + nx * rect.width, rect.y + pts[i].y * rect.height] as const
  }
  ctx.save()
  ctx.lineCap = 'round'
  ctx.lineWidth = style.lineWidth ?? 3
  ctx.strokeStyle = style.lineColor ?? 'rgba(34, 197, 94, 0.9)'
  ctx.beginPath()
  for (const [a, b] of HAND_CONNECTIONS) {
    const [ax, ay] = px(a)
    const [bx, by] = px(b)
    ctx.moveTo(ax, ay)
    ctx.lineTo(bx, by)
  }
  ctx.stroke()
  const r = style.radius ?? 4
  for (let i = 0; i < pts.length; i++) {
    const [x, y] = px(i)
    const hl = style.highlight?.includes(i)
    ctx.fillStyle = hl ? (style.highlightColor ?? '#f59e0b') : (style.pointColor ?? '#ffffff')
    ctx.beginPath()
    ctx.arc(x, y, hl ? r * 2 : r, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

/** Прямокутник, у який вписано кадр vw×vh у полотно cw×ch за правилом object-fit: cover */
export function coverRect(cw: number, ch: number, vw: number, vh: number) {
  const k = Math.max(cw / vw, ch / vh)
  return { x: (cw - vw * k) / 2, y: (ch - vh * k) / 2, width: vw * k, height: vh * k }
}

/**
 * Відео з кадру камери у прямокутник полотна (cover) з дзеркаленням; повертає прямокутник,
 * у який вписано кадр, — його ж треба передати в drawHandSkeleton, щоб скелет збігся з відео.
 */
export function drawVideoCover(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  mirrored = true,
): { x: number; y: number; width: number; height: number } {
  const cw = ctx.canvas.width
  const ch = ctx.canvas.height
  const vw = video.videoWidth || cw
  const vh = video.videoHeight || ch
  const rect = coverRect(cw, ch, vw, vh)
  ctx.save()
  if (mirrored) {
    ctx.translate(cw, 0)
    ctx.scale(-1, 1)
  }
  ctx.drawImage(video, rect.x, rect.y, rect.width, rect.height)
  ctx.restore()
  return rect
}
