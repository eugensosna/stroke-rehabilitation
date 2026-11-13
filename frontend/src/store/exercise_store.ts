import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { sessionStartLevel } from '@/model/adaptation'
import { metricInfo } from '@/exercises/definitions'
import { effectiveRanges } from '@/exercises/calibration'
import { CalibrationService } from '@/services/calibration_service'
import { ExerciseService } from '@/services/exercise_service'
import { hasToken } from '@/services/mock_adapter'
import type { CalibrationRecord, ControlMetric, ExerciseId, ExerciseSettings, SeriesRecord } from '@/types/exercise'

const SESSION_KEY = 'calibratedThisSession'

/**
 * Стан вправ пацієнта: налаштування від фахівця, калібрування, попередні серії.
 * «Сеанс» — сеанс браузера: калібрування обов'язкове перед першою вправою після входу.
 */
export const useExerciseStore = defineStore('exercise', () => {
  const settings = ref<ExerciseSettings | null>(null)
  const calibration = ref<CalibrationRecord | null>(null)
  const series = ref<SeriesRecord[]>([])
  const loading = ref(false)
  const loadError = ref<string | null>(null)
  const calibratedThisSession = ref(sessionStorage.getItem(SESSION_KEY) === '1')
  let loaded: Promise<void> | null = null
  /** Для кого завантажено дані: після входу або виходу гостьові дані треба перечитати */
  let loadedWithToken = hasToken()

  /** Завантаження налаштувань, останнього калібрування і серій (один раз за сеанс сторінки) */
  function load(force = false): Promise<void> {
    if (loaded && !force && loadedWithToken === hasToken()) return loaded
    loadedWithToken = hasToken()
    loading.value = true
    loadError.value = null
    loaded = (async () => {
      try {
        const [s, c, list] = await Promise.all([
          ExerciseService.mySettings(),
          CalibrationService.latest().catch((e) => {
            console.warn('Калібрування недоступне', e)
            return null
          }),
          ExerciseService.mySeries().catch((e) => {
            console.warn('Попередні серії недоступні', e)
            return [] as SeriesRecord[]
          }),
        ])
        settings.value = s
        if (!calibratedThisSession.value || !calibration.value) calibration.value = c
        series.value = list
      } catch (err) {
        console.error(err)
        loadError.value = 'Не вдалося завантажити дані вправ.'
      } finally {
        loading.value = false
      }
    })()
    return loaded
  }

  /** Діапазони для вправ: калібрування пацієнта або типові показники, якщо його ще не було */
  const ranges = computed(() => effectiveRanges(calibration.value?.ranges))
  /** Вправи працюють на типових показниках (калібрування ще не проходили) */
  const usesDefaultRanges = computed(() => calibration.value === null)

  /** Повне калібрування потрібне, якщо попереднього немає */
  const needsFullCalibration = computed(() => calibration.value === null)

  /** Збереження результату калібрування на сервері й позначка для поточного сеансу */
  async function saveCalibration(record: CalibrationRecord): Promise<boolean> {
    calibration.value = record
    calibratedThisSession.value = true
    sessionStorage.setItem(SESSION_KEY, '1')
    try {
      calibration.value = await CalibrationService.save(record)
      return true
    } catch (err) {
      console.error('Не вдалося зберегти калібрування', err)
      return false
    }
  }

  /** Рівень першої спроби: останній рівень попереднього сеансу − 1 */
  function startLevel(id: ExerciseId): number {
    const levels = (settings.value ?? undefined)?.levels ?? { Lmin: 1, Lmax: 10 }
    const last = series.value.find((s) => s.exerciseId === id)
    return sessionStartLevel(last?.endLevel ?? null, levels)
  }

  /** Найбільші амплітуди попереднього сеансу за показниками (одиниці моделі) — для скороченого калібрування */
  function previousAmplitudes(): Partial<Record<ControlMetric, number>> {
    const out: Partial<Record<ControlMetric, number>> = {}
    const lastDay = series.value[0]?.startedAt?.slice(0, 10)
    if (!lastDay) return out
    for (const s of series.value) {
      if (s.startedAt?.slice(0, 10) !== lastDay) continue
      for (const r of s.repetitions ?? []) {
        if (r.amplitude === null) continue
        const a = metricInfo(r.metric).kind === 'flexion' ? (r.amplitude * Math.PI) / 180 : r.amplitude
        out[r.metric] = Math.max(out[r.metric] ?? 0, a)
      }
    }
    return out
  }

  function addSeries(record: SeriesRecord) {
    series.value.unshift(record)
  }

  return {
    settings,
    calibration,
    series,
    loading,
    loadError,
    calibratedThisSession,
    needsFullCalibration,
    ranges,
    usesDefaultRanges,
    load,
    saveCalibration,
    startLevel,
    previousAmplitudes,
    addSeries,
  }
})
