/**
 * Напівпрозорий скелет кисті пацієнта на ігровому полі (керування положенням долоні).
 * Точки — екранні частки 0..1 (дзеркально) з рушія вправи; форма кисті зберігається,
 * центр долоні ставиться в задану точку, розмір сталий.
 */

/** З'єднання ключових точок кисті */
const HAND_LINKS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20],
  [0, 17],
]

/**
 * @param ax, ay центр долоні на полі
 * @param span довжина «зап'ясток — п'ястковий суглоб середнього пальця» на полі, пікс.
 */
export function drawHandOverlay(
  ctx: CanvasRenderingContext2D,
  P: readonly { x: number; y: number }[] | null | undefined,
  ax: number,
  ay: number,
  span = 70,
) {
  if (!P || P.length < 21) return
  const palm = [0, 5, 9, 13, 17]
  const cx = palm.reduce((a, i) => a + P[i].x, 0) / palm.length
  const cy = palm.reduce((a, i) => a + P[i].y, 0) / palm.length
  const s = span / (Math.hypot(P[9].x - P[0].x, P[9].y - P[0].y) || 0.1)
  const pt = (i: number) => ({ x: ax + (P[i].x - cx) * s, y: ay + (P[i].y - cy) * s })

  ctx.save()
  ctx.globalAlpha = 0.55
  ctx.lineCap = 'round'
  ctx.strokeStyle = '#fcd9b6'
  ctx.lineWidth = span * 0.13
  for (const [a, b] of HAND_LINKS) {
    const p = pt(a)
    const q = pt(b)
    ctx.beginPath()
    ctx.moveTo(p.x, p.y)
    ctx.lineTo(q.x, q.y)
    ctx.stroke()
  }
  ctx.globalAlpha = 0.85
  ctx.fillStyle = '#fde8dc'
  for (let i = 0; i < 21; i++) {
    const p = pt(i)
    ctx.beginPath()
    ctx.arc(p.x, p.y, (i % 4 === 0 && i > 0 ? 0.085 : 0.06) * span, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}
