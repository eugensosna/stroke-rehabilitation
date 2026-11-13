import { describe, expect, it } from 'vitest'
import { syntheticHand, type SyntheticHandParams } from '@/dev/syntheticHand'
import { DEFAULT_CALIBRATION_RANGES, effectiveRanges } from '@/exercises/calibration'
import { metricInfo, metricValue } from '@/exercises/definitions'
import { computeFrameMetrics, DEFAULT_MODEL_CONFIG, normalize, toIsotropic } from '@/model'
import type { ControlMetric } from '@/types/exercise'

const u = (metric: ControlMetric, p: SyntheticHandParams) => {
  const m = computeFrameMetrics(toIsotropic(syntheticHand({ W: 640, H: 480, size: 110, ...p }), 640, 480))!
  return normalize(metricValue(m, metric), DEFAULT_CALIBRATION_RANGES[metric])
}
const relaxed = { flex: { 1: 0.15, 2: 0.15, 3: 0.15, 4: 0.15, 5: 0.15 } }

describe('типові діапазони (без калібрування)', () => {
  it('усі діапазони ширші за Δx_min', () => {
    const { dxMin } = DEFAULT_MODEL_CONFIG.calibration
    for (const [metric, r] of Object.entries(DEFAULT_CALIBRATION_RANGES)) {
      const { kind } = metricInfo(metric as ControlMetric)
      expect(Math.abs(r.xg - r.xr)).toBeGreaterThanOrEqual(dxMin[kind])
    }
  })

  it('розслаблена кисть — u нижче θ_r, повний рух — u = 1', () => {
    const thetaR = DEFAULT_MODEL_CONFIG.fsm.thetaR
    for (const k of [2, 3, 4, 5] as const) {
      expect(u(`d${k}`, relaxed)).toBeLessThan(thetaR)
      expect(u(`d${k}`, { thumbTo: { k, amount: 1 } })).toBe(1)
    }
    for (const k of [1, 2, 3, 4, 5] as const) {
      expect(u(`Phi${k}`, relaxed)).toBeLessThan(thetaR)
      expect(u(`Phi${k}`, { flex: { [k]: 1 } })).toBe(1)
    }
    // розкриття: кулак — 0, розкрита долоня — 1
    expect(u('O', { flex: { 1: 1, 2: 1, 3: 1, 4: 1, 5: 1 } })).toBe(0)
    expect(u('O', { flex: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } })).toBe(1)
  })

  it('власне калібрування має пріоритет над типовими значеннями', () => {
    const own = { xr: 0.5, xg: 0.2, unavailable: true }
    const r = effectiveRanges({ d2: own })
    expect(r.d2).toEqual(own)
    expect(r.d3).toEqual(DEFAULT_CALIBRATION_RANGES.d3)
    expect(effectiveRanges(null)).toEqual(DEFAULT_CALIBRATION_RANGES)
  })
})
