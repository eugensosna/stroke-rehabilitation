import type { HandFrame } from '@/types/landmarks'
import type { Point2D } from '@/types/game'

/**
 * Зап'ясток (точка 0) кадру в екранних координатах 0..1.
 * Кадр моделі не дзеркальний, а екран — дзеркальний, тому x відображається.
 */
export function wristPoint(frame: HandFrame, mirrored = true): Point2D | null {
  const wrist = frame.landmarks?.[0]
  if (!wrist) return null
  return { x: mirrored ? 1 - wrist.x : wrist.x, y: wrist.y, timestamp: frame.timestamp }
}
