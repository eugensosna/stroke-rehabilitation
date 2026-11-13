import { describe, expect, it } from 'vitest'
import { ExerciseEngine } from '@/exercises/engine'
import { buildSeriesReport, seriesIntervals } from '@/exercises/report'
import { DEFAULT_EXERCISE_SETTINGS, EXERCISES, metricValue, type ExerciseDefinition } from '@/exercises/definitions'
import {
  availableExercises,
  calibrationSteps,
  CALIBRATION_STEPS,
  mergeShortCalibration,
  sampleMetrics,
  stepRange,
} from '@/exercises/calibration'
import { computeFrameMetrics, DEFAULT_MODEL_CONFIG, toIsotropic } from '@/model'
import type { CalibrationRanges, ExerciseSettings } from '@/types/exercise'
import type { HandFrame } from '@/types/landmarks'
import { seededRng, syntheticHand, type SyntheticHandParams } from '@/dev/syntheticHand'

const W = 640
const H = 480

/** Записаний сеанс: кадри з нерівномірними інтервалами, шумом і пропусками кисті */
function recordSession(
  pose: (t: number) => Omit<SyntheticHandParams, 'W' | 'H' | 'rng' | 'noise'> | null,
  duration: number,
  seed = 1,
): HandFrame[] {
  const rng = seededRng(seed)
  const frames: HandFrame[] = []
  let t = 1000 // мс
  while (t < 1000 + duration * 1000) {
    const p = pose((t - 1000) / 1000)
    frames.push({
      landmarks: p ? syntheticHand({ ...p, W, H, size: 110, noise: 0.6, rng }) : null,
      handedness: p ? 'Right' : null,
      width: W,
      height: H,
      timestamp: t,
      source: 'local',
    })
    t += 28 + rng() * 14 // ≈ 24..36 кадр/с
  }
  return frames
}

/** Щипок: цикл 4 с — 1 с відкрито, 1 с зведення, 1,2 с утримання, 0,8 с розведення */
const pinchPose = (t: number) => {
  const c = t % 4
  const a = c < 1 ? 0 : c < 2 ? c - 1 : c < 3.2 ? 1 : Math.max(0, 1 - (c - 3.2) / 0.8)
  return { thumbTo: { k: 2 as const, amount: a } }
}

function calibrate(frames: HandFrame[], metric: Parameters<typeof metricValue>[1]): CalibrationRanges {
  const ms = frames.flatMap((f) => {
    const m = f.landmarks ? computeFrameMetrics(toIsotropic(f.landmarks, W, H)) : null
    return m ? [m] : []
  })
  const r = stepRange(metric, [], ms, DEFAULT_MODEL_CONFIG.calibration)!
  return { [metric]: r }
}

const settings: ExerciseSettings = {
  ...DEFAULT_EXERCISE_SETTINGS,
  levels: { ...DEFAULT_EXERCISE_SETTINGS.levels, thetaG1: 0.6, dTheta: 0.02, tHold1: 0.5, dTHold: 0.05 },
}

function play(def: ExerciseDefinition, frames: HandFrame[], calibration: CalibrationRanges, target = def.defaultTarget) {
  const engine = new ExerciseEngine(def, calibration, { settings, startLevel: 2, target })
  const updates = frames.map((f) => engine.process(f))
  const report = buildSeriesReport({
    definition: def,
    repetitions: engine.repetitions,
    calibration,
    startLevel: engine.startLevel,
    endLevel: engine.level,
    startedAt: new Date('2026-11-13T10:00:00Z'),
    seriesStartT: frames[0].timestamp / 1000,
    frameStats: engine.frameStats(),
  })
  return { engine, updates, report }
}

describe('рушій вправи на записаному сеансі', () => {
  // 10 циклів щипка; на 6-му циклі кисть зникає на 2 с (пауза)
  const session = recordSession((t) => (t > 21.5 && t < 23.5 ? null : pinchPose(t)), 40, 11)
  const calib = calibrate(recordSession(pinchPose, 8, 99), 'd2')

  it('відтворення дає ті самі повторення і показники при кожному запуску', () => {
    const a = play(EXERCISES.pinch, session, calib)
    const b = play(EXERCISES.pinch, session, calib)
    expect(b.report).toEqual(a.report)
    expect(a.updates.map((u) => u.u)).toEqual(b.updates.map((u) => u.u))
  })

  it('зараховує успішні повторення, фіксує паузу і виключає її з інтервалів', () => {
    const { report, engine, updates } = play(EXERCISES.pinch, session, calib)
    expect(report.attempts).toBeGreaterThanOrEqual(8)
    expect(report.successes).toBeGreaterThanOrEqual(8)
    expect(updates.some((u) => u.events.some((e) => e.type === 'paused'))).toBe(true)
    expect(updates.some((u) => u.hint === 'handLost')).toBe(true)
    expect(engine.repetitions.some((r) => r.pausedBefore)).toBe(true)
    // цикл 4 с → f ≈ 0,25 Гц, ритм рівномірний
    expect(report.frequencyHz).toBeCloseTo(0.25, 1)
    expect(report.rhythmCvPct!).toBeLessThan(10)
    expect(seriesIntervals(engine.repetitions).length).toBeLessThan(report.successes - 1)
    expect(report.endLevel).toBeGreaterThan(report.startLevel)
  })

  it('звіт містить усі поля табл. 2.2 і не містить координат ключових точок', () => {
    const { report } = play(EXERCISES.pinch, session, calib)
    for (const key of [
      'attempts',
      'successes',
      'successRatePct',
      'meanAmplitude',
      'maxAmplitude',
      'frequencyHz',
      'rhythmCvPct',
      'meanHoldTimeS',
      'meanIsolation',
      'ranges',
      'startLevel',
      'endLevel',
      'activeDurationMin',
      'detectionRatePct',
      'trackingMode',
      'meanFps',
    ]) {
      expect(report).toHaveProperty(key)
    }
    expect(report.amplitudeUnit).toBe('s')
    expect(report.ranges[0].metric).toBe('d2')
    expect(report.detectionRatePct).toBeLessThan(100)
    expect(report.meanFps).toBeGreaterThan(24)
    expect(report.meanFps).toBeLessThan(37)
    expect(report.repetitions[0].jointAnglesDeg).toHaveLength(5)
    const json = JSON.stringify(report)
    expect(json).not.toContain('landmarks')
    expect(json).not.toMatch(/"[xyz]":/)
  })

  it('M < 3 → f і V = null', () => {
    const short = session.slice(0, Math.floor(session.length / 5))
    const { report } = play(EXERCISES.pinch, short, calib)
    expect(report.attempts).toBeLessThan(3)
    expect(report.frequencyHz).toBeNull()
    expect(report.rhythmCvPct).toBeNull()
  })

  it('без калібрування показника — підказка «недоступно», u = 0', () => {
    const { updates } = play(EXERCISES.pinch, session.slice(0, 100), {})
    expect(updates.every((u) => u.u === 0)).toBe(true)
    expect(updates.at(-1)!.hint).toBe('unavailable')
  })
})

describe('додаткові умови вправ', () => {
  it('протиставлення: дотик до іншого пальця не зараховується і підсвічується як помилка', () => {
    const touch = (k: 2 | 3) => (t: number) => ({ thumbTo: { k, amount: t % 3 < 1 ? 0 : 1 } })
    const calib: CalibrationRanges = {
      ...calibrate(recordSession(touch(2), 6, 3), 'd2'),
      ...calibrate(recordSession(touch(3), 6, 4), 'd3'),
    }
    const wrong = play(EXERCISES.opposition, recordSession(touch(3), 9, 5), calib, 2)
    expect(wrong.report.successes).toBe(0)
    expect(wrong.updates.some((u) => u.feedback.wrongFinger === 3)).toBe(true)
    const right = play(EXERCISES.opposition, recordSession(touch(2), 9, 6), calib, 2)
    expect(right.report.successes).toBeGreaterThanOrEqual(2)
    expect(right.engine.metric).toBe('d2')
  })

  it('ізольовані рухи: рух сусіднього пальця блокує утримання і показує, який палець зрушив', () => {
    const flex = (fingers: Record<number, number>) => (t: number) => {
      const a = t % 3 < 1 ? 0 : 1
      return { flex: Object.fromEntries(Object.entries(fingers).map(([k, v]) => [k, v * a])) }
    }
    const calib = calibrate(recordSession(flex({ 3: 1 }), 6, 7), 'Phi3')
    const isolated = play(EXERCISES.isolatedFinger, recordSession(flex({ 3: 1 }), 9, 8), calib, 3)
    expect(isolated.report.successes).toBeGreaterThanOrEqual(2)
    expect(isolated.report.meanIsolation!).toBeGreaterThan(0.8)
    expect(isolated.report.amplitudeUnit).toBe('deg')
    const together = play(EXERCISES.isolatedFinger, recordSession(flex({ 2: 1, 3: 1, 4: 1, 5: 0.8 }), 9, 9), calib, 3)
    expect(together.report.successes).toBe(0)
    expect(together.updates.some((u) => u.feedback.movedFingers.includes(4))).toBe(true)
  })

  it('setTarget змінює керуючий показник і скасовує незавершену спробу', () => {
    const engine = new ExerciseEngine(EXERCISES.opposition, {}, { settings, startLevel: 1 })
    expect(engine.metric).toBe('d2')
    engine.setTarget(4)
    expect(engine.metric).toBe('d4')
    expect(engine.unavailable).toBe(true)
  })

  it('розкриття кисті: центр долоні дзеркалиться для екрана', () => {
    const frames = recordSession(() => ({ cx: 0.25 }), 0.5, 2)
    const engine = new ExerciseEngine(EXERCISES.openClose, {}, { settings, startLevel: 1 })
    const u = frames.map((f) => engine.process(f)).at(-1)!
    expect(u.feedback.handPos!.x).toBeGreaterThan(0.6)
  })
})

describe('калібрування', () => {
  it('скорочене калібрування — вихідне положення і рухи обраних вправ', () => {
    // повне — кроки для вправ застосунку (дотики 3–5 лише для «протиставлення», якого немає в списку)
    expect(calibrationSteps('full').map((s) => s.id)).toEqual(
      CALIBRATION_STEPS.filter((s) => !s.id.startsWith('touch')).map((s) => s.id),
    )
    expect(calibrationSteps('short', ['keypad']).map((s) => s.id)).toEqual(['rest'])
    expect(calibrationSteps('short', ['pinch']).map((s) => s.id)).toEqual(['rest', 'pinch'])
    expect(calibrationSteps('short', ['opposition']).map((s) => s.id)).toEqual(['rest', 'pinch', 'touch3', 'touch4', 'touch5'])
  })

  it('діапазон показника з записів кроку і вихідного положення; доступні вправи', () => {
    const toMetrics = (frames: HandFrame[]) =>
      frames.map((f) => computeFrameMetrics(toIsotropic(f.landmarks!, W, H))!)
    const rest = toMetrics(recordSession(() => ({}), 2, 1))
    const fist = toMetrics(recordSession((t) => ({ flex: { 1: t % 2, 2: t % 2, 3: t % 2, 4: t % 2, 5: t % 2 } }), 4, 2))
    const O = stepRange('O', rest, fist, DEFAULT_MODEL_CONFIG.calibration)!
    expect(O.xg).toBeGreaterThan(O.xr)
    expect(O.unavailable).toBe(false)
    const d2 = stepRange('d2', rest, rest, DEFAULT_MODEL_CONFIG.calibration)!
    expect(d2.unavailable).toBe(true)
    expect(availableExercises({ O, d2 })).toEqual(['keypad', 'openClose']) // вказування не потребує калібрування
    expect(sampleMetrics(rest, ['O']).O).toHaveLength(rest.length)
    expect(stepRange('O', [], [], DEFAULT_MODEL_CONFIG.calibration)).toBeNull()
  })

  it('скорочене калібрування зберігає інші показники і розширює діапазон до A_max', () => {
    const merged = mergeShortCalibration(
      { O: { xr: 1, xg: 1.2, unavailable: false } },
      { d2: { xr: 1, xg: 0.2, unavailable: false }, O: { xr: 0.9, xg: 1.5, unavailable: false } },
      { O: 0.5 },
      DEFAULT_MODEL_CONFIG.calibration,
    )
    expect(merged.d2!.xg).toBe(0.2)
    expect(merged.O!.xr).toBe(1)
    expect(merged.O!.xg).toBeCloseTo(1.5, 12)
  })
})
