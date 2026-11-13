import { describe, expect, it } from 'vitest'
import { DEFAULT_MODEL_CONFIG } from '@/model/config'
import type { Vec3 } from '@/model/coords'
import { assessPlacement, PlacementGuide } from '@/exercises/placement'

const params = DEFAULT_MODEL_CONFIG.hints
const W = 640
const H = 480

/**
 * Пласка розкрита долоня у нормованих координатах: зап'ясток (cx, cy + 0.5·size),
 * п'ясткові суглоби на size вище, пальці ще вище.
 */
function hand(cx: number, cy: number, size: number, widthK = 1): Vec3[] {
  const P: Vec3[] = Array.from({ length: 21 }, () => ({ x: cx, y: cy, z: 0 }))
  const wy = cy + 0.5 * size
  P[0] = { x: cx, y: wy, z: 0 }
  const mcpY = wy - size
  const spread = 0.4 * size * widthK * (H / W)
  for (let k = 1; k <= 5; k++) {
    const x0 = cx + (k - 3) * spread
    for (let j = 1; j <= 4; j++) {
      const y = k === 1 ? wy - 0.2 * size * j : mcpY - 0.25 * size * (j - 1)
      P[4 * k - 4 + j] = { x: k === 1 ? cx - 1.2 * spread - 0.1 * j * size : x0, y, z: 0 }
    }
  }
  return P
}

describe('розміщення кисті в кадрі', () => {
  it('кисть у центрі нормального розміру — без проблем', () => {
    const a = assessPlacement(hand(0.5, 0.55, 0.22), W, H, params)
    expect(a.issues).toEqual([])
    expect(a.scale).toBeCloseTo(0.22, 2)
  })

  it('немає кисті', () => {
    expect(assessPlacement(null, W, H, params).issues).toEqual(['noHand'])
  })

  it('дзеркальний екран: кисть ліворуч на екрані (великий x кадру) — посунути праворуч', () => {
    expect(assessPlacement(hand(0.9, 0.55, 0.22), W, H, params).issues[0]).toBe('moveRight')
    expect(assessPlacement(hand(0.1, 0.55, 0.22), W, H, params).issues[0]).toBe('moveLeft')
    // без дзеркала напрямки протилежні
    expect(assessPlacement(hand(0.9, 0.55, 0.22), W, H, params, false).issues[0]).toBe('moveLeft')
  })

  it('кисть надто високо або низько', () => {
    expect(assessPlacement(hand(0.5, 0.15, 0.15), W, H, params).issues).toContain('moveDown')
    expect(assessPlacement(hand(0.5, 0.95, 0.15), W, H, params).issues).toContain('moveUp')
  })

  it('задалеко і заблизько', () => {
    expect(assessPlacement(hand(0.5, 0.55, 0.06), W, H, params).issues).toEqual(['closer'])
    expect(assessPlacement(hand(0.5, 0.55, 0.45), W, H, params).issues[0]).toBe('farther')
  })

  it('кисть ребром до камери', () => {
    expect(assessPlacement(hand(0.5, 0.55, 0.22, 0.1), W, H, params).issues).toEqual(['edgeOn'])
  })
})

describe('журнал підказок', () => {
  it('перша оцінка одразу, далі — після утримання; повтори не дублюються', () => {
    const g = new PlacementGuide(params)
    expect(g.update(null, W, H, 0)?.issue).toBe('noHand')
    expect(g.update(null, W, H, 0.1)).toBeNull()
    // коротка поява кисті не змінює підказку
    expect(g.update(hand(0.5, 0.55, 0.22), W, H, 0.2)).toBeNull()
    expect(g.update(hand(0.5, 0.55, 0.22), W, H, 0.5)).toBeNull()
    expect(g.update(hand(0.5, 0.55, 0.22), W, H, 0.75)?.issue).toBe('ok')
    expect(g.update(hand(0.5, 0.55, 0.06), W, H, 1)).toBeNull()
    expect(g.update(hand(0.5, 0.55, 0.06), W, H, 1.6)?.text).toBe('Піднесіть кисть ближче до камери')
    expect(g.log.map((e) => e.issue)).toEqual(['noHand', 'ok', 'closer'])
  })
})
