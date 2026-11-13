import { describe, expect, it } from 'vitest'
import { ExerciseFsm, type FsmEvent, type FsmInput, type LevelThresholds } from '@/model'
import { seededRng } from '@/dev/syntheticHand'

const params = { thetaR: 0.2, hysteresis: 0.08, tLost: 1 }
const th: LevelThresholds = { level: 1, thetaG: 0.7, tHold: 0.5, tMax: 5 }
const DT = 1 / 30

/** Прогін послідовності u з кроком 1/30 с */
function drive(us: (number | null)[], opts: { thresholds?: LevelThresholds; extra?: (i: number) => Partial<FsmInput> } = {}) {
  const fsm = new ExerciseFsm(params, () => opts.thresholds ?? th)
  const events: FsmEvent[] = []
  us.forEach((u, i) => {
    events.push(
      ...fsm.step({ t: i * DT, u: u ?? 0, handPresent: u !== null, x: u ?? undefined, ...opts.extra?.(i) }),
    )
  })
  return { fsm, events, types: events.map((e) => e.type) }
}

const repeat = (v: number | null, n: number) => Array<number | null>(n).fill(v)
const ramp = (a: number, b: number, n: number) => Array.from({ length: n }, (_, i) => a + ((b - a) * (i + 1)) / n)

describe('скінченний автомат вправи', () => {
  it('повне успішне повторення', () => {
    const { fsm, types } = drive([...repeat(0, 5), ...ramp(0, 0.9, 10), ...repeat(0.9, 20), ...ramp(0.9, 0, 10), ...repeat(0, 3)])
    expect(types).toEqual(['moveStart', 'goalReached', 'success', 'repetitionEnd'])
    expect(fsm.state).toBe('Waiting')
    const rec = fsm.records[0]
    expect(rec.success).toBe(true)
    expect(rec.tm).not.toBeNull()
    expect(rec.ts).toBeLessThan(rec.tm!)
    expect(rec.tm!).toBeLessThan(rec.te)
    // утримання триває до виходу за гістерезис під час повернення
    expect(rec.holdTime).toBeGreaterThanOrEqual(th.tHold)
    // x записується від t_s (u > θ_r) до t_e (u ≤ θ_r)
    expect(Math.max(...rec.x)).toBeCloseTo(0.9, 6)
    expect(Math.min(...rec.x)).toBeGreaterThan(0.1)
    expect(Math.min(...rec.x)).toBeLessThanOrEqual(params.thetaR + 0.1)
  })

  it('шум біля цільового порога з гістерезисом не дає подвійних зарахувань і goalLost', () => {
    const rng = seededRng(3)
    const noisy = Array.from({ length: 60 }, () => th.thetaG + (rng() - 0.5) * 0.1) // ±0,05 < h
    const { types, fsm } = drive([...repeat(0, 3), ...ramp(0, 0.7, 5), ...noisy, ...ramp(0.7, 0, 5), ...repeat(0, 3)])
    expect(types.filter((t) => t === 'success')).toHaveLength(1)
    expect(types).not.toContain('goalLost')
    expect(fsm.records).toHaveLength(1)
  })

  it('шум біля порога після зарахування не дає повторного зарахування без повернення', () => {
    const rng = seededRng(5)
    const noisy = Array.from({ length: 120 }, () => th.thetaG + (rng() - 0.5) * 0.3) // виходить за гістерезис
    const { types } = drive([...repeat(0, 3), ...repeat(0.9, 20), ...noisy])
    expect(types.filter((t) => t === 'success')).toHaveLength(1)
    expect(types).not.toContain('repetitionEnd')
  })

  it('u < θ_g − h повертає в «Рух»', () => {
    const { types } = drive([...repeat(0, 3), ...repeat(0.8, 5), ...repeat(0.5, 3)])
    expect(types).toEqual(['moveStart', 'goalReached', 'goalLost'])
  })

  it('тайм-аут T_max — невдала спроба', () => {
    const { types, fsm } = drive([...repeat(0, 3), ...repeat(0.5, 200), ...repeat(0, 3)])
    expect(types).toEqual(['moveStart', 'fail', 'repetitionEnd'])
    expect(fsm.records[0].success).toBe(false)
    expect(fsm.records[0].tm).toBeNull()
    const failAt = fsm.records[0].ts + th.tMax
    expect(fsm.records[0].te).toBeGreaterThanOrEqual(failAt)
  })

  it('пауза: втрата кисті довше t_lost скасовує спробу, повернення → «Очікування»', () => {
    const { types, fsm, events } = drive([
      ...repeat(0, 3),
      ...repeat(0.5, 5),
      ...repeat(null, 40),
      ...repeat(0, 3),
      ...repeat(0.9, 30),
      ...repeat(0, 3),
    ])
    expect(types).toEqual(['moveStart', 'paused', 'resumed', 'moveStart', 'goalReached', 'success', 'repetitionEnd'])
    expect(fsm.records).toHaveLength(1)
    expect(fsm.records[0].pausedBefore).toBe(true)
    const paused = events.find((e) => e.type === 'paused')!
    expect(paused.t).toBeGreaterThanOrEqual(8 * DT + 1 - 1e-9)
  })

  it('короткий пропуск кисті не перериває вправу', () => {
    const { types } = drive([...repeat(0, 3), ...repeat(0.9, 5), ...repeat(null, 10), ...repeat(0.9, 20), ...repeat(0, 2)])
    expect(types).toEqual(['moveStart', 'goalReached', 'success', 'repetitionEnd'])
  })

  it('ізольованість блокує утримання', () => {
    const { types } = drive([...repeat(0, 3), ...repeat(0.9, 30)], { extra: () => ({ isolationOk: false }) })
    expect(types).not.toContain('goalReached')
    const ok = drive([...repeat(0, 3), ...repeat(0.9, 30)], { extra: (i) => ({ isolationOk: i > 15 }) })
    expect(ok.types).toEqual(['moveStart', 'goalReached', 'success'])
  })

  it('t_h = 0 — зарахування одразу при досягненні цілі; Φ записуються', () => {
    const Phi = { 1: 0, 2: 0.1, 3: 0, 4: 0, 5: 0 }
    const { fsm, types } = drive([...repeat(0, 2), ...repeat(0.9, 2), ...repeat(0, 2)], {
      thresholds: { ...th, tHold: 0 },
      extra: () => ({ Phi }),
    })
    expect(types).toEqual(['moveStart', 'goalReached', 'success', 'repetitionEnd'])
    expect(fsm.records[0].Phi![2].length).toBeGreaterThan(0)
  })

  it('cancelAttempt() скасовує поточну спробу', () => {
    const { fsm } = drive([...repeat(0, 2), ...repeat(0.5, 2)])
    expect(fsm.attempt).not.toBeNull()
    expect(fsm.holdTau(1)).toBe(0)
    fsm.cancelAttempt()
    expect(fsm.attempt).toBeNull()
    expect(fsm.state).toBe('Waiting')
  })
})
