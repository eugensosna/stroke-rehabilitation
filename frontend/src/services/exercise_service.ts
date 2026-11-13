import { isAxiosError } from 'axios'
import { api } from './api'
import { DEFAULT_EXERCISE_SETTINGS } from '@/exercises/definitions'
import type { ExerciseSettings, SeriesRecord, SeriesReport } from '@/types/exercise'
import { isRecord, unexpectedResponse } from './response_guard'

/** Звіти серій і налаштування вправ. Контракт — docs/api-exercise.md */
export const ExerciseService = {
  /** POST /api/exercise-series — збереження звіту серії (лише числові показники) */
  async saveSeries(report: SeriesReport): Promise<SeriesRecord> {
    const response = await api.post<unknown>('/exercise-series', report)
    if (!isRecord(response.data) || typeof response.data.id === 'undefined') {
      throw unexpectedResponse('/exercise-series', response.data)
    }
    return response.data as unknown as SeriesRecord
  },

  /** GET /api/exercise-series/my — серії поточного пацієнта, від нових до старих */
  async mySeries(): Promise<SeriesRecord[]> {
    try {
      const response = await api.get<unknown>('/exercise-series/my')
      if (response.data === null || response.data === undefined || response.data === '') return []
      if (!Array.isArray(response.data)) throw unexpectedResponse('/exercise-series/my', response.data)
      return response.data as SeriesRecord[]
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 404) return []
      throw error
    }
  },

  /** GET /api/exercise-settings/my — налаштування, задані фахівцем; типові, якщо їх ще немає */
  async mySettings(): Promise<ExerciseSettings> {
    try {
      const response = await api.get<unknown>('/exercise-settings/my')
      if (response.data !== null && response.data !== undefined && response.data !== '' && !isRecord(response.data)) {
        throw unexpectedResponse('/exercise-settings/my', response.data)
      }
      const s = (response.data ?? {}) as Partial<ExerciseSettings>
      // «Кодовий замок» раніше був вправою на протиставлення
      if (s.exercises) s.exercises = [...new Set(s.exercises.map((e) => (e === 'opposition' ? 'keypad' : e)))]
      return {
        ...DEFAULT_EXERCISE_SETTINGS,
        ...s,
        levels: { ...DEFAULT_EXERCISE_SETTINGS.levels, ...s.levels },
        isolationMin: { ...DEFAULT_EXERCISE_SETTINGS.isolationMin, ...s.isolationMin },
        dxMin: { ...DEFAULT_EXERCISE_SETTINGS.dxMin, ...s.dxMin },
      }
    } catch (error) {
      console.warn('Налаштування вправ недоступні, використано типові', error)
      return structuredClone(DEFAULT_EXERCISE_SETTINGS)
    }
  },
}
