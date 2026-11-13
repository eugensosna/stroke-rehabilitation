import { describe, expect, it } from 'vitest'
import {
  amplitude,
  calibrateRange,
  clamp01,
  extendRange,
  intervalVariation,
  isolationIndex,
  mean,
  movedFingers,
  normalize,
  percentile,
  repetitionFrequency,
  repetitionIntervals,
} from '@/model'

describe('процентиль (NIST/SEMATECH e-Handbook 7.2.6.2)', () => {
  // приклад з NIST: 12 вимірювань, 90-й процентиль = 95.1981
  const nist = [
    95.1772, 95.1567, 95.1937, 95.1959, 95.1442, 95.061, 95.1591, 95.1195, 95.1065, 95.0925, 95.199,
    95.1682,
  ]
  it('90-й процентиль прикладу NIST', () => {
    expect(percentile(nist, 0.9)).toBeCloseTo(95.1981, 4)
  })
  it('обмеження на краях', () => {
    expect(percentile(nist, 0.01)).toBe(95.061)
    expect(percentile(nist, 0.99)).toBe(95.199)
  })
  it('лінійна інтерполяція і медіана', () => {
    expect(percentile([1, 2, 3, 4], 0.5)).toBeCloseTo(2.5, 12)
    expect(percentile([3, 1, 2], 0.5)).toBe(2)
  })
  it('порожня вибірка → null', () => {
    expect(percentile([], 0.5)).toBeNull()
  })
})

describe('калібрування', () => {
  const ramp = Array.from({ length: 101 }, (_, i) => i / 100) // 0..1

  it('зростаючий показник: x_r — 5-й, x_g — 95-й процентиль', () => {
    const r = calibrateRange(ramp, 'increasing', 0.1)!
    expect(r.xr).toBeCloseTo(percentile(ramp, 0.05)!, 12)
    expect(r.xg).toBeCloseTo(percentile(ramp, 0.95)!, 12)
    expect(r.unavailable).toBe(false)
  })
  it('спадний показник: навпаки', () => {
    const r = calibrateRange(ramp, 'decreasing', 0.1)!
    expect(r.xr).toBeCloseTo(percentile(ramp, 0.95)!, 12)
    expect(r.xg).toBeCloseTo(percentile(ramp, 0.05)!, 12)
    expect(normalize(r.xr, r)).toBe(0)
    expect(normalize(r.xg, r)).toBe(1)
    expect(normalize(0.5, r)).toBeCloseTo(0.5, 2)
  })
  it('u обмежується до [0; 1]', () => {
    const r = { xr: 1, xg: 2 }
    expect(normalize(0, r)).toBe(0)
    expect(normalize(5, r)).toBe(1)
    expect(normalize(1.25, r)).toBeCloseTo(0.25, 12)
    expect(normalize(1, { xr: 1, xg: 1 })).toBe(0)
    expect(clamp01(-1)).toBe(0)
  })
  it('замалий діапазон → unavailable', () => {
    const r = calibrateRange([1, 1.01, 1.02, 1.01], 'increasing', 0.15)!
    expect(r.unavailable).toBe(true)
  })
  it('порожній запис → null', () => {
    expect(calibrateRange([], 'increasing', 0.1)).toBeNull()
  })
  it('скорочене калібрування розширює діапазон до A_max попереднього сеансу', () => {
    const inc = extendRange({ xr: 1, xg: 1.2, unavailable: false }, 0.5, 0.1)
    expect(inc.xg).toBeCloseTo(1.5, 12)
    const dec = extendRange({ xr: 1, xg: 0.9, unavailable: true }, 0.4, 0.15)
    expect(dec.xg).toBeCloseTo(0.6, 12)
    expect(dec.unavailable).toBe(false)
    // менша амплітуда не звужує діапазон
    expect(extendRange(inc, 0.1, 0.1).xg).toBeCloseTo(1.5, 12)
    expect(extendRange(inc, null, 0.1)).toBe(inc)
  })
})

describe('часові показники', () => {
  it('A_m = max − min', () => {
    expect(amplitude([0.2, 0.9, 0.5, 0.1])).toBeCloseTo(0.8, 12)
    expect(amplitude([])).toBeNull()
  })
  it('рівномірна послідовність: f = 1/T, V = 0', () => {
    const moments = [0, 2, 4, 6, 8].map((t) => ({ t }))
    const T = repetitionIntervals(moments)
    expect(T).toEqual([2, 2, 2, 2])
    expect(repetitionFrequency(T)).toBeCloseTo(0.5, 12)
    expect(intervalVariation(T)).toBeCloseTo(0, 12)
  })
  it('нерівномірна послідовність: σ_T зі знаменником M − 2', () => {
    const moments = [0, 1, 3, 6].map((t) => ({ t })) // T = 1, 2, 3; M = 4
    const T = repetitionIntervals(moments)
    expect(repetitionFrequency(T)).toBeCloseTo(0.5, 12)
    // T̄ = 2, σ = sqrt((1 + 0 + 1)/2) = 1 → V = 50 %
    expect(intervalVariation(T)).toBeCloseTo(50, 12)
  })
  it('інтервали з паузою виключаються', () => {
    const T = repetitionIntervals([{ t: 0 }, { t: 2 }, { t: 30, pausedBefore: true }, { t: 32 }, { t: 34 }])
    expect(T).toEqual([2, 2, 2])
  })
  it('M < 3 → null, а не NaN', () => {
    expect(repetitionFrequency([])).toBeNull()
    expect(repetitionFrequency([2])).toBeNull()
    expect(intervalVariation([2])).toBeNull()
    expect(intervalVariation([0, 0])).toBeNull()
    expect(mean([])).toBeNull()
  })
})

describe('ізольованість I_k', () => {
  it('рухається лише заданий палець → 1', () => {
    expect(isolationIndex(2, { 1: 0, 2: 1.5, 3: 0, 4: 0, 5: 0 })).toBe(1)
  })
  it('усі однаково → 0', () => {
    expect(isolationIndex(3, { 1: 1, 2: 1, 3: 1, 4: 1, 5: 1 })).toBe(0)
  })
  it('сусідній більше → 0, не від\'ємне', () => {
    expect(isolationIndex(4, { 1: 2, 2: 2, 3: 3, 4: 1, 5: 2 })).toBe(0)
  })
  it('частковий рух сусіда', () => {
    expect(isolationIndex(4, { 1: 0, 2: 0, 3: 0.5, 4: 1, 5: 0 })).toBeCloseTo(1 - 0.5 / 4, 12)
  })
  it('ΔΦ_k ≈ 0 → 0', () => {
    expect(isolationIndex(2, { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 })).toBe(0)
  })
  it('пальці, що зрушили', () => {
    expect(movedFingers(4, { 1: 0, 2: 0, 3: 0.8, 4: 1, 5: 0.2 }, 0.5)).toEqual([3])
    expect(movedFingers(4, { 1: 0, 2: 0, 3: 0.3, 4: 0, 5: 0 }, 0.5)).toEqual([3])
  })
})
