import { describe, expect, it } from 'vitest'
import { HandFilter, OneEuroFilter, smoothingFactor, type Vec3 } from '@/model'
import { seededRng } from '@/dev/syntheticHand'

const variance = (xs: number[]) => {
  const m = xs.reduce((a, b) => a + b, 0) / xs.length
  return xs.reduce((a, b) => a + (b - m) ** 2, 0) / xs.length
}

function gaussNoise(rng: () => number) {
  return Math.sqrt(-2 * Math.log(Math.max(rng(), 1e-12))) * Math.cos(2 * Math.PI * rng())
}

describe('фільтр 1€', () => {
  it('α = 1/(1 + 1/(2π·fc·Δt))', () => {
    expect(smoothingFactor(1, 1 / 30)).toBeCloseTo(1 / (1 + 30 / (2 * Math.PI)), 12)
  })

  it('на сталому сигналі з шумом дисперсія виходу менша за вхідну', () => {
    const rng = seededRng(1)
    const f = new OneEuroFilter({ fcMin: 1, beta: 0.01, dCutoff: 1 })
    const input: number[] = []
    const output: number[] = []
    for (let n = 0; n < 600; n++) {
      const x = 100 + gaussNoise(rng) * 2
      input.push(x)
      output.push(f.filter(x, n / 30))
    }
    expect(variance(output.slice(30))).toBeLessThan(variance(input.slice(30)) * 0.3)
  })

  it('на стрибку запізнення зменшується з ростом β', () => {
    const lag = (beta: number) => {
      const f = new OneEuroFilter({ fcMin: 1, beta, dCutoff: 1 })
      for (let n = 0; n < 30; n++) f.filter(0, n / 30)
      // кількість кадрів до досягнення 90 % стрибку
      for (let n = 30; n < 300; n++) {
        if (f.filter(100, n / 30) >= 90) return n - 30
      }
      return Infinity
    }
    const l0 = lag(0)
    const l1 = lag(0.01)
    const l2 = lag(0.1)
    expect(l1).toBeLessThan(l0)
    expect(l2).toBeLessThan(l1)
  })

  it('нерівномірні Δt не ламають фільтр', () => {
    const rng = seededRng(7)
    const f = new OneEuroFilter({ fcMin: 1, beta: 0.01, dCutoff: 1 })
    let t = 0
    let y = 0
    for (let n = 0; n < 500; n++) {
      t += 0.005 + rng() * 0.2
      y = f.filter(50 + gaussNoise(rng), t)
      expect(Number.isFinite(y)).toBe(true)
    }
    expect(Math.abs(y - 50)).toBeLessThan(5)
    // повторна або менша часова мітка не змінює стан
    expect(f.filter(1000, t)).toBe(y)
    expect(f.filter(1000, t - 1)).toBe(y)
  })

  it('reset() — наступне значення без згладжування', () => {
    const f = new OneEuroFilter({ fcMin: 1, beta: 0, dCutoff: 1 })
    f.filter(0, 0)
    f.filter(0, 0.1)
    f.reset()
    expect(f.filter(42, 0.2)).toBe(42)
  })
})

describe('фільтр кисті (63 фільтри)', () => {
  const hand = (x: number): Vec3[] => Array.from({ length: 21 }, (_, i) => ({ x: x + i, y: i, z: 0 }))
  const params = { fcMin: 1, beta: 0, dCutoff: 1 }

  it('кадр без кисті не оновлює стан', () => {
    const hf = new HandFilter(params, 1)
    hf.update(hand(0), 0)
    expect(hf.update(null, 0.03)).toBeNull()
    const a = hf.update(hand(10), 0.06)!
    // згладжено відносно попереднього положення, а не скинуто
    expect(a[0].x).toBeGreaterThan(0)
    expect(a[0].x).toBeLessThan(10)
  })

  it('кисті немає довше t_lost — фільтри скидаються', () => {
    const hf = new HandFilter(params, 0.5)
    hf.update(hand(0), 0)
    hf.update(null, 0.3)
    hf.update(null, 0.6)
    const a = hf.update(hand(10), 0.7)!
    expect(a[0].x).toBe(10)
    expect(a[20].x).toBe(30)
  })

  it('довгий проміжок між кадрами з кистю теж скидає фільтри', () => {
    const hf = new HandFilter(params, 0.5)
    hf.update(hand(0), 0)
    expect(hf.update(hand(10), 2)![0].x).toBe(10)
  })
})
