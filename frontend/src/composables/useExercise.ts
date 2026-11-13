/**
 * Композиційна функція вправи (задача 3.3): джерело кадрів → фільтр → показники → u → автомат → рівень.
 * Гра отримує лише u, стан автомата, підказки і події — без ключових точок.
 */
import { computed, getCurrentInstance, onUnmounted, readonly, ref, shallowRef } from 'vue'
import { ExerciseEngine, HINT_TEXTS, type EngineFeedback, type HintId, type PointerJudge } from '@/exercises/engine'
import { buildSeriesReport } from '@/exercises/report'
import type { ExerciseDefinition } from '@/exercises/definitions'
import { thetaG } from '@/model/adaptation'
import type { Finger } from '@/model/config'
import type { FsmEvent, FsmEventType, FsmState } from '@/model/exerciseFsm'
import { ExerciseService } from '@/services/exercise_service'
import type { CalibrationRanges, ExerciseSettings, SeriesRecord, SeriesReport } from '@/types/exercise'
import type { SaveStatus } from '@/types/game'
import type { HandFrame } from '@/types/landmarks'
import { isGuest } from '@/services/mock_adapter'


/** Події для гри: події автомата і завершення серії */
export type ExerciseEventType = FsmEventType | 'seriesComplete'
export type ExerciseEvent = FsmEvent | { type: 'seriesComplete'; t: number }

export interface ExerciseSource {
  onFrame(cb: (frame: HandFrame) => void): () => void
}

export interface UseExerciseOptions {
  startLevel: number
  target?: Finger | null
  /** Бали за успішне повторення: base + bonus·L */
  scoreBase?: number
  scoreLevelBonus?: number
}

export function useExercise(
  definition: ExerciseDefinition,
  calibration: CalibrationRanges,
  settings: ExerciseSettings,
  source: ExerciseSource,
  options: UseExerciseOptions,
) {
  const engine = shallowRef(createEngine())
  const u = ref(0)
  /** Момент (performance.now(), мс) останнього значення u — для інтерполяції в грі */
  const uTime = ref(0)
  const state = ref<FsmState>('Waiting')
  const level = ref(engine.value.level)
  const repetitions = ref(0)
  const successes = ref(0)
  const score = ref(0)
  const hintId = ref<HintId | null>(null)
  const feedback = shallowRef<EngineFeedback>({ handPos: null, wrongFinger: null, movedFingers: [] })
  const finished = ref(false)
  const running = ref(false)
  const target = ref<Finger | null>(engine.value.target)
  const saveStatus = ref<SaveStatus | null>(null)
  const savedRecord = shallowRef<SeriesRecord | null>(null)

  const total = computed(() => settings.repetitionsPerSeries)
  const hint = computed(() => (hintId.value ? { id: hintId.value, text: HINT_TEXTS[hintId.value] } : null))

  const listeners = new Map<ExerciseEventType, Set<(e: ExerciseEvent) => void>>()
  let startedAt = new Date()
  let pointerJudge: PointerJudge | null = null
  let seriesStartT: number | null = null

  function createEngine() {
    return new ExerciseEngine(definition, calibration, {
      settings,
      startLevel: options.startLevel,
      target: options.target,
    })
  }

  /** Підписка на подію; повертає функцію відписки */
  function on(type: ExerciseEventType, cb: (e: ExerciseEvent) => void): () => void {
    if (!listeners.has(type)) listeners.set(type, new Set())
    listeners.get(type)!.add(cb)
    return () => listeners.get(type)?.delete(cb)
  }

  function emit(e: ExerciseEvent) {
    listeners.get(e.type)?.forEach((cb) => cb(e))
  }

  function handleFrame(frame: HandFrame) {
    if (!running.value || finished.value) return
    seriesStartT ??= frame.timestamp / 1000
    const upd = engine.value.process(frame)
    u.value = upd.u
    uTime.value = frame.timestamp
    state.value = upd.state
    level.value = upd.level
    hintId.value = upd.hint
    feedback.value = upd.feedback
    for (const e of upd.events) {
      if (e.type === 'success') {
        successes.value++
        // невдала спроба не зменшує бали
        score.value += (options.scoreBase ?? 10) + (options.scoreLevelBonus ?? 2) * upd.level
      }
      if (e.type === 'repetitionEnd') repetitions.value = engine.value.repetitions.length
      emit(e)
    }
    if (repetitions.value >= total.value && !finished.value) {
      finished.value = true
      running.value = false
      emit({ type: 'seriesComplete', t: upd.t })
    }
  }

  const off = source.onFrame(handleFrame)

  function start() {
    startedAt = new Date()
    running.value = true
  }

  /** Нова серія з поточного рівня */
  function restart() {
    const lastLevel = engine.value.level
    engine.value = new ExerciseEngine(definition, calibration, { settings, startLevel: lastLevel, target: target.value })
    engine.value.setPointerJudge(pointerJudge)
    u.value = 0
    state.value = 'Waiting'
    level.value = engine.value.level
    repetitions.value = 0
    successes.value = 0
    score.value = 0
    hintId.value = null
    finished.value = false
    saveStatus.value = null
    savedRecord.value = null
    seriesStartT = null
    start()
  }

  /** Достроково завершити серію (кнопка «Завершити») */
  function finish() {
    if (finished.value) return
    engine.value.fsm.cancelAttempt()
    finished.value = true
    running.value = false
    emit({ type: 'seriesComplete', t: performance.now() / 1000 })
  }

  /** Гра з вказуванням: визначення клавіші під пальцем і її правильності */
  function setPointerJudge(judge: PointerJudge | null) {
    pointerJudge = judge
    engine.value.setPointerJudge(judge)
  }

  function setTarget(k: Finger | null) {
    engine.value.setTarget(k)
    target.value = engine.value.target
  }

  /** Звіт серії за табл. 2.2 */
  function report(): SeriesReport {
    const e = engine.value
    return buildSeriesReport({
      definition,
      repetitions: e.repetitions,
      calibration,
      startLevel: e.startLevel,
      endLevel: e.level,
      startedAt,
      seriesStartT: seriesStartT ?? 0,
      frameStats: e.frameStats(),
      isolationEps: e.config.isolationEps,
    })
  }

  /** Збереження звіту на сервері з українськими повідомленнями статусу */
  async function save(): Promise<SeriesRecord | null> {
    const r = report()
    if (r.attempts === 0) {
      saveStatus.value = { type: 'info', text: 'У серії немає спроб — зберігати нічого.' }
      return null
    }
    saveStatus.value = { type: 'info', text: 'Зберігаємо результати…' }
    try {
      const saved = await ExerciseService.saveSeries(r)
      savedRecord.value = saved
      saveStatus.value = isGuest()
        ? { type: 'success', text: 'Результати збережено лише в цьому браузері. Увійдіть, щоб їх побачив фахівець.' }
        : { type: 'success', text: 'Результати збережено. Фахівець з реабілітації побачить їх у кабінеті.' }
      return saved
    } catch (err) {
      console.error('Не вдалося зберегти серію', err)
      saveStatus.value = { type: 'error', text: 'Не вдалося зберегти результати. Перевірте підключення і спробуйте ще раз.' }
      return null
    }
  }

  if (getCurrentInstance()) onUnmounted(off)

  return {
    u: readonly(u),
    uTime: readonly(uTime),
    state: readonly(state),
    level: readonly(level),
    repetitions: readonly(repetitions),
    successes: readonly(successes),
    total,
    score: readonly(score),
    hint,
    feedback,
    finished: readonly(finished),
    running: readonly(running),
    target: readonly(target),
    saveStatus,
    savedRecord,
    definition,
    on,
    start,
    restart,
    finish,
    setTarget,
    setPointerJudge,
    report,
    save,
    /** Порог цілі поточного рівня (для відображення цілі в грі) */
    thetaG: computed(() => thetaG(level.value, engine.value.config.levels)),
    thetaR: computed(() => engine.value.config.fsm.thetaR),
  }
}

export type ExerciseApi = ReturnType<typeof useExercise>
