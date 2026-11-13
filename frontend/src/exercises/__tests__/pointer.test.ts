import { describe, expect, it } from 'vitest'
import { ExerciseEngine, type EngineUpdate, type PointerJudge } from '@/exercises/engine'
import { effectiveRanges } from '@/exercises/calibration'
import { DEFAULT_EXERCISE_SETTINGS, EXERCISES } from '@/exercises/definitions'
import { DepthTracker, pointingFinger } from '@/exercises/pointer'
import { buildSeriesReport } from '@/exercises/report'
import { seededRng, syntheticHand } from '@/dev/syntheticHand'
import type { HandFrame } from '@/types/landmarks'

const W = 640
const H = 480

describe('палець-вказівник', () => {
  it('перший прямий від вказівного до мізинця; великий не враховується', () => {
    const Phi = { 1: 0, 2: 2, 3: 0.2, 4: 0.1, 5: 2 }
    expect(pointingFinger(Phi, 0.6)).toBe(3)
    expect(pointingFinger({ ...Phi, 2: 0.3 }, 0.6)).toBe(2)
    expect(pointingFinger({ 1: 0, 2: 2, 3: 2, 4: 2, 5: 0.5 }, 0.6)).toBe(5)
    expect(pointingFinger({ 1: 0, 2: 2, 3: 2, 4: 2, 5: 2 }, 0.6)).toBeNull()
  })
})

describe('глибина натискання Z = 1 − s₀/s', () => {
  it('наближення на 20 % відстані — розмір зростає в 1/0,8 раза', () => {
    const d = new DepthTracker(1)
    for (let i = 0; i <= 60; i++) d.update(100, i / 30, false)
    expect(d.update(100 / 0.8, 2.05, true)).toBeCloseTo(0.2, 6)
  })

  it('повільне наближення підтягує базову відстань', () => {
    const d = new DepthTracker(1)
    let z = 0
    // +20 % розміру за 10 с
    for (let i = 0; i <= 300; i++) z = d.update(100 * (1 + (0.2 * i) / 300), i / 30, false)
    expect(z).toBeLessThan(0.03)
  })

  it('під час спроби базова відстань не змінюється', () => {
    const d = new DepthTracker(0.5)
    d.update(100, 0, false)
    d.update(100, 0.1, false)
    for (let i = 0; i < 30; i++) d.update(120, 0.2 + i / 30, true)
    expect(d.baseline).toBeCloseTo(100, 6)
  })
})

/** Кисть із прямим вказівним (інші зігнуті): розмір змінюється для «натискання» */
function pointFrames(size: (t: number) => number, duration: number, flexIndex = 0): HandFrame[] {
  const rng = seededRng(3)
  const frames: HandFrame[] = []
  for (let t = 0; t < duration; t += 1 / 30) {
    frames.push({
      landmarks: syntheticHand({
        W,
        H,
        size: size(t),
        cy: 0.75,
        flex: { 1: 0.6, 2: flexIndex, 3: 1, 4: 1, 5: 1 },
        noise: 0.3,
        rng,
      }),
      handedness: 'Right',
      width: W,
      height: H,
      timestamp: 1000 + t * 1000,
      source: 'local',
    })
  }
  return frames
}

/** 2 с спокійно, натискання +35 % розміру (Z ≈ 0,26) за 0,3 с, 0,6 с утримання, повернення */
const press = (t: number) => (t < 2 ? 100 : t < 2.3 ? 100 + 117 * (t - 2) : t < 2.9 ? 135 : t < 3.2 ? 135 - 117 * (t - 2.9) : 100)

function run(judge: PointerJudge | null, frames: HandFrame[]) {
  const engine = new ExerciseEngine(EXERCISES.keypad, effectiveRanges(null), {
    settings: DEFAULT_EXERCISE_SETTINGS,
    startLevel: 1,
  })
  engine.setPointerJudge(judge)
  const updates: EngineUpdate[] = frames.map((f) => engine.process(f))
  const events = updates.flatMap((u) => u.events.map((e) => e.type))
  return { engine, updates, events }
}

describe('вправа «Кодовий замок» (вказування)', () => {
  const hits: string[] = []
  const judge = (correct: boolean): PointerJudge => ({
    hitTest: (x, y) => {
      hits.push(`${x.toFixed(2)},${y.toFixed(2)}`)
      return '5'
    },
    isCorrect: () => correct,
  })

  it('натискання правильної клавіші — успіх', () => {
    const { engine, events, updates } = run(judge(true), pointFrames(press, 5))
    expect(events).toEqual(['moveStart', 'goalReached', 'success', 'repetitionEnd'])
    expect(engine.repetitions).toHaveLength(1)
    expect(engine.repetitions[0].target).toBe(2)
    expect(engine.repetitions[0].metric).toBe('Z')
    // вказівник: вказівний палець, екранні координати дзеркальні
    const p = updates[10].feedback.pointer!
    expect(p.finger).toBe(2)
    expect(p.x).toBeGreaterThan(0)
    expect(p.x).toBeLessThan(1)
    const report = buildSeriesReport({
      definition: EXERCISES.keypad,
      repetitions: engine.repetitions,
      calibration: effectiveRanges(null),
      startLevel: 1,
      endLevel: engine.level,
      startedAt: new Date(0),
      seriesStartT: 1,
      frameStats: engine.frameStats(),
    })
    expect(report.amplitudeUnit).toBe('depth')
    // розмах Z від початку спроби (≈ θ_r) до найглибшого натискання
    expect(report.maxAmplitude!).toBeGreaterThan(0.08)
  })

  it('натиснуто не ту клавішу — невдача одразу, без очікування T_max', () => {
    const { engine, events, updates } = run(judge(false), pointFrames(press, 5))
    expect(events).toEqual(['moveStart', 'fail', 'repetitionEnd'])
    expect(engine.repetitions[0].success).toBe(false)
    expect(updates.some((u) => u.feedback.pointer?.wrong === '5')).toBe(true)
  })

  it('поза клавішами або без гри натискання не зараховується', () => {
    expect(run({ hitTest: () => null, isCorrect: () => true }, pointFrames(press, 5)).engine.repetitions).toHaveLength(0)
    expect(run(null, pointFrames(press, 5)).engine.repetitions).toHaveLength(0)
  })

  it('недотиснули і відвели кисть — спроба скасовується', () => {
    // лише +12 % розміру (Z ≈ 0,11 < 0,2)
    const half = (t: number) => (t < 2 ? 100 : t < 2.6 ? 112 : 100)
    const { engine, events } = run(judge(true), pointFrames(half, 4))
    expect(engine.repetitions).toHaveLength(0)
    expect(events).not.toContain('fail')
  })

  it('прямого пальця немає — підказка і немає вказівника', () => {
    const { updates } = run(judge(true), pointFrames(() => 100, 1, 1))
    const last = updates[updates.length - 1]
    expect(last.feedback.pointer).toBeNull()
    expect(last.hint).toBe('straightFinger')
  })
})
