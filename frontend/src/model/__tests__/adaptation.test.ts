import { describe, expect, it } from 'vitest'
import {
  DEFAULT_MODEL_CONFIG,
  levelThresholds,
  mergeConfig,
  nextLevel,
  sessionStartLevel,
  Staircase,
  tHold,
  thetaG,
  tMax,
  type LevelParams,
} from '@/model'

const p: LevelParams = { ...DEFAULT_MODEL_CONFIG.levels, Lmin: 1, Lmax: 5, thetaG1: 0.6, dTheta: 0.1 }

const run = (start: number, results: boolean[]) => {
  const s = new Staircase(start, p)
  return results.map((r) => s.record(r))
}

describe('параметри рівня', () => {
  it('θ_g(L) = θ_g,1 + (L − 1)·Δθ, не більше 1', () => {
    expect(thetaG(1, p)).toBeCloseTo(0.6, 12)
    expect(thetaG(3, p)).toBeCloseTo(0.8, 12)
    expect(thetaG(10, p)).toBe(1)
  })
  it('t_h зростає, T_max зменшується, але не нижче T_max,min', () => {
    expect(tHold(2, p)).toBeGreaterThan(tHold(1, p))
    expect(tMax(2, p)).toBeLessThan(tMax(1, p))
    expect(tMax(1000, p)).toBe(p.tMaxMin)
    expect(levelThresholds(2, p).level).toBe(2)
  })
})

describe('правило «два вгору — один вниз»', () => {
  it('два успіхи поспіль на одному рівні підвищують рівень', () => {
    expect(run(2, [true, true])).toEqual([2, 3])
  })
  it('кожна невдача знижує рівень', () => {
    expect(run(3, [false, false])).toEqual([2, 1])
  })
  it('два успіхи на різних рівнях не підвищують рівень', () => {
    // 2 успіхи → 3; третій успіх (на рівні 3, попередній на 2) не підвищує; четвертий — підвищує
    expect(run(2, [true, true, true, true])).toEqual([2, 3, 3, 4])
  })
  it('успіх після невдачі не підвищує рівень', () => {
    expect(run(3, [true, false, true, true])).toEqual([3, 2, 2, 3])
  })
  it('межі L_min і L_max дотримуються', () => {
    expect(run(1, [false, false])).toEqual([1, 1])
    expect(run(5, [true, true, true, true])).toEqual([5, 5, 5, 5])
    expect(new Staircase(99, p).level).toBe(5)
  })
  it('формула з символом Кронекера', () => {
    expect(nextLevel(3, true, { level: 3, success: true }, p)).toBe(4)
    expect(nextLevel(3, true, { level: 2, success: true }, p)).toBe(3)
    expect(nextLevel(3, true, null, p)).toBe(3)
    expect(nextLevel(3, false, { level: 3, success: true }, p)).toBe(2)
  })
  it('наступний сеанс — з рівня, на один нижчого', () => {
    expect(sessionStartLevel(4, p)).toBe(3)
    expect(sessionStartLevel(1, p)).toBe(1)
    expect(sessionStartLevel(null, p)).toBe(1)
  })
})

describe('конфігурація', () => {
  it('часткові налаштування зливаються з типовими', () => {
    const c = mergeConfig({ filter: { beta: 0.5 }, levels: { Lmax: 7 } })
    expect(c.filter.beta).toBe(0.5)
    expect(c.filter.fcMin).toBe(DEFAULT_MODEL_CONFIG.filter.fcMin)
    expect(c.levels.Lmax).toBe(7)
    expect(c.isolationMin[3]).toBe(DEFAULT_MODEL_CONFIG.isolationMin[3])
    // типові значення не змінюються
    expect(DEFAULT_MODEL_CONFIG.filter.beta).not.toBe(0.5)
  })
})
