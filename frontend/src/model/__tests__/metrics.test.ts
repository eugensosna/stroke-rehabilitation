import { describe, expect, it } from 'vitest'
import {
  computeFrameMetrics,
  dist,
  fingerFlexion,
  handScale,
  jointAngle,
  openness,
  tipDistance,
  toDegrees,
  toIsotropic,
  type Vec3,
} from '@/model'
import { handGeometry, syntheticHand } from '@/dev/syntheticHand'

const v = (x: number, y: number, z = 0): Vec3 => ({ x, y, z })

describe('кут згинання φ(a,b,c)', () => {
  it('прямий суглоб → ≈0', () => {
    expect(jointAngle(v(0, 0), v(1, 0), v(2, 0))).toBeCloseTo(0, 6)
  })
  it('прямий кут → π/2', () => {
    expect(jointAngle(v(0, 0), v(1, 0), v(1, 1))).toBeCloseTo(Math.PI / 2, 9)
  })
  it('повністю складений суглоб → π', () => {
    expect(jointAngle(v(0, 0), v(1, 0), v(0, 0.0001))).toBeCloseTo(Math.PI, 3)
  })
  it('вироджені вектори нульової довжини не дають NaN', () => {
    expect(jointAngle(v(1, 1), v(1, 1), v(2, 2))).toBe(0)
    expect(jointAngle(v(0, 0), v(1, 1), v(1, 1))).toBe(0)
  })
  it('аргумент arccos обмежується (колінеарні вектори з похибкою округлення)', () => {
    const a = jointAngle(v(0.1, 0.2, 0.3), v(0.4, 0.5, 0.6), v(0.7, 0.8, 0.9))
    expect(Number.isNaN(a)).toBe(false)
    expect(a).toBeCloseTo(0, 6)
  })
  it('градуси лише для звітів', () => {
    expect(toDegrees(Math.PI / 2)).toBeCloseTo(90, 9)
  })
})

describe('кути пальців синтетичної кисті', () => {
  it('випрямлена кисть → Φ_k ≈ 0, зігнута → Φ_k зростає', () => {
    const straight = handGeometry()
    const bent = handGeometry({ flex: { 3: 1 } })
    expect(fingerFlexion(straight, 3)).toBeCloseTo(0, 6)
    // 85° + 100° + 70°
    expect(toDegrees(fingerFlexion(bent, 3))).toBeCloseTo(255, 3)
    expect(fingerFlexion(bent, 2)).toBeCloseTo(0, 6)
  })
  it('великий палець має два суглоби', () => {
    const m = computeFrameMetrics(handGeometry({ flex: { 1: 1 } }))!
    expect(m.joints[1]).toHaveLength(2)
    expect(m.joints[2]).toHaveLength(3)
    expect(toDegrees(m.Phi[1])).toBeCloseTo(130, 3)
  })
  it('Φ̄ — середнє Φ_k', () => {
    const m = computeFrameMetrics(handGeometry({ flex: { 2: 0.5, 5: 1 } }))!
    const sum = m.Phi[1] + m.Phi[2] + m.Phi[3] + m.Phi[4] + m.Phi[5]
    expect(m.PhiMean).toBeCloseTo(sum / 5, 12)
  })
})

describe('ізотропні координати', () => {
  it('однакове зміщення в пікселях по x і y дає однакову відстань при W ≠ H', () => {
    const W = 1280
    const H = 720
    const shift = 64 // пікс.
    const [a, bx, by] = toIsotropic(
      [v(0.5, 0.5), v(0.5 + shift / W, 0.5), v(0.5, 0.5 + shift / H)],
      W,
      H,
    )
    expect(dist(a, bx)).toBeCloseTo(shift, 9)
    expect(dist(a, by)).toBeCloseTo(shift, 9)
  })
  it('z масштабується на W', () => {
    expect(toIsotropic([v(0, 0, 0.1)], 640, 480)[0].z).toBeCloseTo(64, 9)
  })
})

describe('інваріантність d_k, O, s', () => {
  const W = 640
  const H = 480
  const pose = { flex: { 3: 0.4, 4: 0.6 }, thumbTo: { k: 2 as const, amount: 0.5 } }
  const ref = computeFrameMetrics(toIsotropic(syntheticHand({ ...pose, W, H, size: 100 }), W, H))!

  it.each([
    ['масштаб', { size: 160 }],
    ['зсув', { cx: 0.3, cy: 0.6 }],
    ['дзеркало по x', { mirror: true }],
    ['поворот у площині', { rotation: 0.4 }],
    ['масштаб + зсув + дзеркало', { size: 70, cx: 0.65, cy: 0.8, mirror: true }],
  ])('%s', (_name, change) => {
    const m = computeFrameMetrics(toIsotropic(syntheticHand({ ...pose, W, H, size: 100, ...change }), W, H))!
    for (const k of [2, 3, 4, 5] as const) expect(m.d[k]).toBeCloseTo(ref.d[k], 9)
    expect(m.O).toBeCloseTo(ref.O, 9)
    for (const k of [1, 2, 3, 4, 5] as const) expect(m.Phi[k]).toBeCloseTo(ref.Phi[k], 6)
  })
  it('s дорівнює заданому розміру кисті й пропорційний масштабу', () => {
    const P = toIsotropic(syntheticHand({ W, H, size: 100 }), W, H)
    expect(handScale(P)).toBeCloseTo(100, 9)
    const P2 = toIsotropic(syntheticHand({ W, H, size: 150, cx: 0.2 }), W, H)
    expect(handScale(P2)).toBeCloseTo(150, 9)
  })
})

describe('відстані та розкриття', () => {
  it('щипок зменшує d_2, кулак зменшує O', () => {
    const open = handGeometry()
    const pinch = handGeometry({ thumbTo: { k: 2, amount: 1 } })
    const fist = handGeometry({ flex: { 1: 1, 2: 1, 3: 1, 4: 1, 5: 1 } })
    const s = handScale(open)
    expect(tipDistance(pinch, 2, s)).toBeCloseTo(0, 9)
    expect(tipDistance(open, 2, s)).toBeGreaterThan(0.5)
    expect(openness(fist, handScale(fist))).toBeLessThan(openness(open, s) * 0.75)
  })
  it('кисть ребром до камери зменшує ширину долоні', () => {
    const W = 640
    const H = 480
    const flat = computeFrameMetrics(toIsotropic(syntheticHand({ W, H }), W, H))!
    // поворот навколо вертикальної осі на 80°: x стискається, z зростає
    const P = handGeometry().map((p) => {
      const a = (80 * Math.PI) / 180
      return { x: p.x * Math.cos(a) * 100 + 320, y: p.y * 100 + 360, z: p.x * Math.sin(a) * 100 }
    })
    const edge = computeFrameMetrics(P)!
    expect(edge.palmWidthRatio).toBeLessThan(flat.palmWidthRatio * 0.3)
  })
  it('вироджена кисть (s = 0) → null', () => {
    expect(computeFrameMetrics(Array.from({ length: 21 }, () => v(1, 1)))).toBeNull()
  })
})
