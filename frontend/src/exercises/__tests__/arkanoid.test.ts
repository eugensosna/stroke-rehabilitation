import { describe, expect, it } from 'vitest'
import { ExerciseEngine } from '@/exercises/engine'
import { effectiveRanges } from '@/exercises/calibration'
import { DEFAULT_EXERCISE_SETTINGS, EXERCISES } from '@/exercises/definitions'
import { buildSeriesReport } from '@/exercises/report'
import { ArkanoidScene, FIELD_H } from '@/games/arkanoid'
import type { SceneInput } from '@/games/common'
import { syntheticHand } from '@/dev/syntheticHand'
import type { HandFrame } from '@/types/landmarks'

const W = 640
const H = 480

const frame = (t: number, cx: number | null): HandFrame => ({
  landmarks: cx === null ? null : syntheticHand({ W, H, size: 100, cx, cy: 0.8 }),
  handedness: cx === null ? null : 'Right',
  width: W,
  height: H,
  timestamp: 1000 + t * 1000,
  source: 'local',
})

const engine = () =>
  new ExerciseEngine(EXERCISES.arkanoid, effectiveRanges(null), { settings: DEFAULT_EXERCISE_SETTINGS, startLevel: 1 })

describe('вправа «Арканоїд» (керування положенням долоні)', () => {
  it('u — положення долоні на екрані (дзеркально), кисть передається для показу', () => {
    const e = engine()
    let upd = e.process(frame(0, 0.3))
    for (let i = 1; i < 30; i++) upd = e.process(frame(i / 30, 0.3))
    // x кадру 0,3 → на дзеркальному екрані праворуч
    expect(upd.u).toBeGreaterThan(0.5)
    expect(upd.feedback.hand).toHaveLength(21)
    expect(upd.events).toEqual([])
    // автомат сам повторень не починає
    expect(e.fsm.attempt).toBeNull()
  })

  it('результат гри — повторення з розмахом руху долоні', () => {
    const e = engine()
    for (let i = 0; i < 60; i++) e.process(frame(i / 30, 0.5 + 0.2 * Math.sin(i / 6)))
    const ev = e.gameOutcome(true)
    expect(ev.map((x) => x.type)).toEqual(['success', 'repetitionEnd'])
    for (let i = 60; i < 90; i++) e.process(frame(i / 30, 0.5))
    expect(e.gameOutcome(false).map((x) => x.type)).toEqual(['fail', 'repetitionEnd'])
    expect(e.repetitions.map((r) => r.success)).toEqual([true, false])
    const report = buildSeriesReport({
      definition: EXERCISES.arkanoid,
      repetitions: e.repetitions,
      calibration: effectiveRanges(null),
      startLevel: 1,
      endLevel: e.level,
      startedAt: new Date(0),
      seriesStartT: 1,
      frameStats: e.frameStats(),
    })
    expect(report.amplitudeUnit).toBe('frame')
    expect(report.repetitions[0].metric).toBe('X')
    expect(report.maxAmplitude!).toBeGreaterThan(0.3)
  })

  it('під час паузи (кисть втрачено) результат гри не зараховується', () => {
    const e = engine()
    e.process(frame(0, 0.5))
    for (let i = 1; i < 60; i++) e.process(frame(i / 30, null))
    expect(e.fsm.state).toBe('Paused')
    expect(e.gameOutcome(false)).toEqual([])
  })
})

describe('сцена «Арканоїд»', () => {
  const input = (u: number): SceneInput => ({ u, state: 'Waiting', thetaG: 1, thetaR: 0, handPos: { x: 0.5, y: 0.5 } })

  function play(paddleU: (ballX: number) => number, seconds: number) {
    const log: string[] = []
    let rnd = 0.3
    const scene = new ArkanoidScene({ onHit: () => log.push('hit'), onMiss: () => log.push('miss') }, () => (rnd = (rnd * 7.3) % 1))
    scene.setActive(true)
    const ball = () => (scene as unknown as { ball: { x: number; y: number } }).ball
    for (let i = 0; i < seconds * 60; i++) {
      scene.update(1 / 60, input(paddleU(ball().x)))
      expect(ball().y).toBeLessThan(FIELD_H + 40)
    }
    return log
  }

  it('ракетка під м\'ячем — відбиття', () => {
    const log = play((x) => Math.min(1, Math.max(0, (x - 85) / (800 - 170))), 8)
    expect(log.filter((l) => l === 'hit').length).toBeGreaterThan(1)
    expect(log).not.toContain('miss')
  })

  it('ракетка в куті — м\'яч пропущено', () => {
    const log = play(() => 0, 8)
    expect(log).toContain('miss')
  })

  it('поза серією м\'яч не рухається', () => {
    const scene = new ArkanoidScene({ onHit: () => {}, onMiss: () => {} })
    for (let i = 0; i < 300; i++) scene.update(1 / 60, input(0.5))
    expect((scene as unknown as { ball: { stuck: boolean } }).ball.stuck).toBe(true)
  })
})
