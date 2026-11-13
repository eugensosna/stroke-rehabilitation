import { describe, expect, it } from 'vitest'
import { FrameStats } from '@/utils/frameStats'

describe('частота обробки і частка кадрів з кистю', () => {
  it('F = (K − 1)/(t_K − t_1)', () => {
    const s = new FrameStats(2000, 25)
    for (let i = 0; i <= 60; i++) s.push(i * (1000 / 30), true)
    expect(s.fps).toBeCloseTo(30, 6)
    expect(s.detectionRate).toBe(1)
  })
  it('кисть сховано → частка падає до 0', () => {
    const s = new FrameStats(2000, 25)
    for (let i = 0; i <= 60; i++) s.push(i * 33, true)
    for (let i = 61; i <= 200; i++) s.push(i * 33, false)
    expect(s.detectionRate).toBe(0)
  })
  it('lowFps — лише після того, як частота нижча за мінімум довше інтервалу усереднення, і один раз', () => {
    const s = new FrameStats(2000, 25)
    const fired: number[] = []
    for (let i = 0; i <= 100; i++) if (s.push(i * 60, true)) fired.push(i * 60) // ≈16,7 кадр/с
    expect(fired).toHaveLength(1)
    // вікно заповнюється за ~1,8 с, потім ще 2 с низької частоти
    expect(fired[0]).toBeGreaterThanOrEqual(3600)
  })
  it('достатня частота не викликає lowFps; reset() очищає вікно', () => {
    const s = new FrameStats(2000, 25)
    let fired = false
    for (let i = 0; i <= 300; i++) fired ||= s.push(i * 30, true)
    expect(fired).toBe(false)
    s.reset()
    expect(s.fps).toBe(0)
    expect(s.detectionRate).toBe(0)
  })
})
