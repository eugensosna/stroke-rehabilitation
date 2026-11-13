/**
 * Агрегування серії (підрозділ «Показники сеансу для фахівця», табл. 2.2 роботи).
 * Звіт містить лише числові показники — без координат ключових точок і зображень.
 */
import { FINGERS, type Finger } from '@/model/config'
import { isolationIndex } from '@/model/isolation'
import { toDegrees } from '@/model/metrics'
import { amplitude, intervalVariation, mean, repetitionFrequency, repetitionIntervals } from '@/model/temporal'
import type { CalibrationRanges, ControlMetric, RepetitionReport, SeriesReport } from '@/types/exercise'
import { metricInfo, type ExerciseDefinition } from './definitions'
import type { EngineRepetition, FrameStatsSummary } from './engine'

export interface SeriesReportInput {
  definition: ExerciseDefinition
  repetitions: readonly EngineRepetition[]
  calibration: CalibrationRanges
  startLevel: number
  endLevel: number
  /** Початок серії (дата для звіту) */
  startedAt: Date
  /** Часова мітка першого кадру серії, с — від неї відлічуються моменти повторень */
  seriesStartT: number
  frameStats: FrameStatsSummary
  /** ε для ΔΦ_k у формулі ізольованості */
  isolationEps?: number
}

/** Значення показника в одиницях звіту: кути — градуси, відстані — частки s */
export function toReportUnits(metric: ControlMetric, value: number): number {
  return metricInfo(metric).kind === 'flexion' ? toDegrees(value) : value
}

const round = (v: number | null, digits = 4): number | null =>
  v === null || !Number.isFinite(v) ? null : Math.round(v * 10 ** digits) / 10 ** digits

/** I_k повторення за розмахами ΔΦ_j */
export function repetitionIsolation(rep: EngineRepetition, eps = 1e-6): number | null {
  if (!rep.Phi || !rep.target) return null
  const delta = {} as Record<Finger, number>
  for (const j of FINGERS) delta[j] = amplitude(rep.Phi[j]) ?? 0
  return isolationIndex(rep.target, delta, eps)
}

/**
 * Інтервали T_m між моментами досягнення цілі сусідніх повторень.
 * Інтервали з паузою, а також з невдалою спробою між ними, виключаються.
 */
export function seriesIntervals(reps: readonly EngineRepetition[]): number[] {
  const moments: { t: number; pausedBefore: boolean }[] = []
  reps.forEach((r, i) => {
    if (r.tm === null) return
    const prev = reps[i - 1]
    moments.push({ t: r.tm, pausedBefore: r.pausedBefore || !prev || prev.tm === null })
  })
  // перший момент не має попереднього — його ознака не використовується
  return repetitionIntervals(moments)
}

export function buildSeriesReport(input: SeriesReportInput): SeriesReport {
  const { definition: def, repetitions: reps, frameStats: fs } = input
  const isolated = def.id === 'isolatedFinger'

  const N = reps.length
  const Ns = reps.filter((r) => r.success).length
  const amplitudes = reps.map((r) => {
    const a = amplitude(r.x)
    return a === null ? null : toReportUnits(r.metric, a)
  })
  const amps = amplitudes.filter((a): a is number => a !== null)
  const T = seriesIntervals(reps)
  const holds = reps.filter((r) => r.success).map((r) => r.holdTime)
  const isolations = reps.map((r) => (isolated ? repetitionIsolation(r, input.isolationEps) : null))

  const usedMetrics = [...new Set(reps.map((r) => r.metric))]
  if (usedMetrics.length === 0) usedMetrics.push(def.metric(def.defaultTarget))
  const ranges = usedMetrics.flatMap((metric) => {
    const r = input.calibration[metric]
    return r ? [{ metric, xr: round(toReportUnits(metric, r.xr))!, xg: round(toReportUnits(metric, r.xg))! }] : []
  })

  const repetitions: RepetitionReport[] = reps.map((r, i) => ({
    index: i + 1,
    target: r.target,
    metric: r.metric,
    startS: round(r.ts - input.seriesStartT, 3)!,
    goalS: r.tm === null ? null : round(r.tm - input.seriesStartT, 3),
    endS: round(r.te - input.seriesStartT, 3)!,
    success: r.success,
    level: r.level,
    amplitude: round(amplitudes[i]),
    holdTimeS: round(r.holdTime, 3)!,
    isolation: round(isolations[i]),
    pausedBefore: r.pausedBefore,
    jointAnglesDeg: r.peakJoints ? FINGERS.map((k) => r.peakJoints![k].map((a) => round(toDegrees(a), 1)!)) : null,
  }))

  const span = fs.firstTs !== null && fs.lastTs !== null ? fs.lastTs - fs.firstTs : 0
  const isoValues = isolations.filter((v): v is number => v !== null)

  return {
    exerciseId: def.id,
    startedAt: input.startedAt.toISOString(),
    attempts: N,
    successes: Ns,
    successRatePct: N > 0 ? round((Ns / N) * 100, 1) : null,
    meanAmplitude: round(mean(amps)),
    maxAmplitude: amps.length > 0 ? round(Math.max(...amps)) : null,
    amplitudeUnit: def.kind === 'flexion' ? 'deg' : def.kind === 'depth' ? 'depth' : def.kind === 'position' ? 'frame' : 's',
    frequencyHz: round(repetitionFrequency(T)),
    rhythmCvPct: round(intervalVariation(T), 2),
    meanHoldTimeS: round(mean(holds), 3),
    meanIsolation: isolated ? round(mean(isoValues)) : null,
    ranges,
    startLevel: input.startLevel,
    endLevel: input.endLevel,
    activeDurationMin: round(fs.activeS / 60, 2)!,
    detectionRatePct: fs.frames > 0 ? round((fs.handFrames / fs.frames) * 100, 1)! : 0,
    trackingMode: fs.mode,
    meanFps: fs.frames > 1 && span > 0 ? round(((fs.frames - 1) * 1000) / span, 1)! : 0,
    repetitions,
  }
}
