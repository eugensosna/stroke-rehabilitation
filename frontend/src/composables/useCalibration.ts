/**
 * Калібрування (задача 3.4): покрокові записи керуючих показників і обчислення x_r, x_g.
 * Кожен крок: підготовка (відлік) → запис → результат { xr, xg, unavailable }.
 */
import { computed, getCurrentInstance, onUnmounted, ref, shallowRef } from 'vue'
import {
  availableExercises,
  calibrationSteps,
  mergeShortCalibration,
  stepRange,
  type CalibrationStep,
} from '@/exercises/calibration'
import { mergeConfig, type DeepPartial, type ModelConfig } from '@/model/config'
import { toIsotropic } from '@/model/coords'
import { HandFilter } from '@/model/handFilter'
import { computeFrameMetrics, type FrameMetrics } from '@/model/metrics'
import type { CalibrationRanges, CalibrationRecord, ControlMetric, ExerciseId, StoredRange } from '@/types/exercise'
import type { HandFrame } from '@/types/landmarks'

export type CalibrationPhase = 'ready' | 'prep' | 'record' | 'result' | 'done'

export interface StepResult {
  status: 'ok' | 'small' | 'noHand' | 'skipped'
  ranges: Partial<Record<ControlMetric, StoredRange>>
}

export interface UseCalibrationOptions {
  kind: 'full' | 'short'
  /** Для скороченого калібрування — вправи, для яких записується максимальний рух */
  exercises?: ExerciseId[]
  /** Попереднє калібрування (показники, які не калібруються зараз, беруться з нього) */
  previous?: CalibrationRecord | null
  /** Найбільші амплітуди попереднього сеансу (одиниці моделі) */
  previousAmplitudes?: Partial<Record<ControlMetric, number>>
  config?: DeepPartial<ModelConfig>
}

/** Мінімальна частка кадрів з кистю під час запису кроку */
const MIN_HAND_SHARE = 0.5

export function useCalibration(
  source: { onFrame(cb: (frame: HandFrame) => void): () => void },
  options: UseCalibrationOptions,
) {
  const config = mergeConfig(options.config)
  const params = config.calibration
  const steps = calibrationSteps(options.kind, options.exercises)

  const index = ref(0)
  const phase = ref<CalibrationPhase>('ready')
  /** Секунди, що лишилися до кінця підготовки або запису */
  const remaining = ref(0)
  /** Прогрес запису 0..1 */
  const progress = ref(0)
  const results = ref<Record<string, StepResult>>({})
  const record = shallowRef<CalibrationRecord | null>(null)

  const step = computed<CalibrationStep>(() => steps[Math.min(index.value, steps.length - 1)])
  const lastResult = computed(() => results.value[step.value.id] ?? null)

  const filter = new HandFilter(config.filter, config.fsm.tLost)
  const recorded = new Map<string, FrameMetrics[]>()
  let frames = 0
  let handFrames = 0
  let timer: ReturnType<typeof setInterval> | null = null

  const off = source.onFrame((frame) => {
    const t = frame.timestamp / 1000
    const P =
      frame.landmarks && frame.width > 0
        ? filter.update(toIsotropic(frame.landmarks, frame.width, frame.height), t)
        : filter.update(null, t)
    if (phase.value !== 'record') return
    frames++
    const m = P ? computeFrameMetrics(P, config.eps) : null
    if (!m) return
    handFrames++
    recorded.get(step.value.id)?.push(m)
  })

  function clearTimer() {
    if (timer !== null) clearInterval(timer)
    timer = null
  }

  function runPhase(next: 'prep' | 'record', seconds: number, done: () => void) {
    clearTimer()
    phase.value = next
    const end = performance.now() + seconds * 1000
    remaining.value = seconds
    progress.value = 0
    timer = setInterval(() => {
      const left = Math.max(0, end - performance.now()) / 1000
      remaining.value = Math.ceil(left)
      progress.value = 1 - left / seconds
      if (left <= 0) {
        clearTimer()
        done()
      }
    }, 100)
  }

  /** Почати поточний крок: підготовка з відліком, потім запис */
  function begin() {
    const id = step.value.id
    runPhase('prep', params.prepS, () => {
      recorded.set(id, [])
      frames = 0
      handFrames = 0
      runPhase('record', params.recordS, finishStep)
    })
  }

  function finishStep() {
    const s = step.value
    const stepFrames = recorded.get(s.id) ?? []
    const rest = recorded.get('rest') ?? []
    const ranges: StepResult['ranges'] = {}
    let status: StepResult['status'] = 'ok'
    if (frames === 0 || handFrames / frames < MIN_HAND_SHARE) {
      status = 'noHand'
    } else {
      for (const metric of s.metrics) {
        const r = stepRange(metric, rest, stepFrames, params)
        if (r) ranges[metric] = r
        if (!r || r.unavailable) status = 'small'
      }
    }
    results.value = { ...results.value, [s.id]: { status, ranges } }
    phase.value = 'result'
  }

  /** Повторити поточний крок */
  function retry() {
    clearTimer()
    recorded.delete(step.value.id)
    begin()
  }

  /** Пропустити крок (вправа для його показника буде недоступна) */
  function skip() {
    clearTimer()
    results.value = { ...results.value, [step.value.id]: { status: 'skipped', ranges: {} } }
    next()
  }

  /** До наступного кроку або підсумку */
  function next() {
    clearTimer()
    if (index.value + 1 >= steps.length) {
      complete()
      return
    }
    index.value++
    phase.value = 'ready'
  }

  function complete() {
    const fresh: CalibrationRanges = {}
    for (const r of Object.values(results.value)) Object.assign(fresh, r.ranges)
    const ranges =
      options.kind === 'short'
        ? mergeShortCalibration(fresh, options.previous?.ranges ?? null, options.previousAmplitudes ?? {}, params)
        : fresh
    record.value = { createdAt: new Date().toISOString(), kind: options.kind, ranges }
    phase.value = 'done'
  }

  const available = computed(() => (record.value ? availableExercises(record.value.ranges) : []))

  function dispose() {
    clearTimer()
    off()
  }

  if (getCurrentInstance()) onUnmounted(dispose)

  return {
    steps,
    index,
    step,
    phase,
    remaining,
    progress,
    results,
    lastResult,
    record,
    available,
    begin,
    retry,
    skip,
    next,
    dispose,
  }
}
