import { isAxiosError } from 'axios'
import { api } from './api'
import type { CalibrationRecord } from '@/types/exercise'
import { isRecord, unexpectedResponse } from './response_guard'

/** Результати калібрування. Контракт — docs/api-exercise.md */
export const CalibrationService = {
  /** GET /api/calibrations/latest — останнє калібрування; null, якщо його ще не було */
  async latest(): Promise<CalibrationRecord | null> {
    try {
      const response = await api.get<unknown>('/calibrations/latest')
      if (response.data === null || response.data === undefined || response.data === '') return null
      if (!isRecord(response.data) || !isRecord(response.data.ranges)) {
        throw unexpectedResponse('/calibrations/latest', response.data)
      }
      return response.data as unknown as CalibrationRecord
    } catch (error) {
      if (isAxiosError(error) && (error.response?.status === 404 || error.response?.status === 204)) return null
      throw error
    }
  },

  /** POST /api/calibrations — збереження результату калібрування */
  async save(record: CalibrationRecord): Promise<CalibrationRecord> {
    const response = await api.post<unknown>('/calibrations', record)
    if (!isRecord(response.data) || !isRecord(response.data.ranges)) {
      throw unexpectedResponse('/calibrations', response.data)
    }
    return response.data as unknown as CalibrationRecord
  },
}
