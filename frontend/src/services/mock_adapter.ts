/**
 * Локальний адаптер axios для ресурсів вправ і калібрування; дані зберігаються в localStorage браузера.
 * Використовується у двох випадках:
 *  - mock-режим без бекенду (VITE_USE_MOCKS=true) — для всіх користувачів;
 *  - гостьовий режим — користувач не увійшов, тож результати лишаються лише в цьому браузері.
 * Інші запити передаються справжньому адаптеру.
 */
import { getAdapter, type AxiosAdapter, type AxiosInstance, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'
import { DEFAULT_EXERCISE_SETTINGS } from '@/exercises/definitions'
import type { CalibrationRecord, SeriesRecord, SeriesReport } from '@/types/exercise'

const MOCK_KEY = 'mock-api'
/** Сховище гостя (окремо від mock-бази, щоб не змішувати дані) */
export const GUEST_KEY = 'guest-exercise-data'

interface MockDb {
  series: SeriesRecord[]
  calibrations: CalibrationRecord[]
  nextId: number
}

function load(KEY: string): MockDb {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw) as MockDb
  } catch {
    // пошкоджені дані — починаємо з порожньої бази
  }
  return { series: [], calibrations: [], nextId: 1 }
}

function save(KEY: string, db: MockDb) {
  try {
    localStorage.setItem(KEY, JSON.stringify(db))
  } catch {
    // сховище недоступне — дані лишаються лише в пам'яті сторінки
  }
}

function respond<T>(config: InternalAxiosRequestConfig, status: number, data: T): AxiosResponse {
  // та сама обгортка ApiResponse<T>, що й у Spring Boot бекенді
  return {
    data: { success: status < 400, message: status < 400 ? 'OK' : 'Not found', data },
    status,
    statusText: String(status),
    headers: {},
    config,
  }
}

function body<T>(config: InternalAxiosRequestConfig): T {
  return (typeof config.data === 'string' ? JSON.parse(config.data) : config.data) as T
}

/** Шляхи, які обслуговує локальний адаптер */
const LOCAL_PATHS = ['/exercise-series', '/exercise-series/my', '/calibrations', '/calibrations/latest', '/exercise-settings/my']

const pathOf = (config: InternalAxiosRequestConfig) => (config.url ?? '').replace(/^\/api/, '').split('?')[0]

/** Чи є в сеансі токен (користувач увійшов) */
export const hasToken = () => {
  try {
    return !!sessionStorage.getItem('token')
  } catch {
    return false
  }
}

/** Гостьовий режим: користувач не увійшов, а mock-режим вимкнено */
export const isGuest = () => !useMocks && !hasToken()

export function createMockAdapter(fallback: AxiosAdapter): AxiosAdapter {
  return async (config) => {
    const url = pathOf(config)
    const method = (config.method ?? 'get').toLowerCase()
    const KEY = useMocks ? MOCK_KEY : GUEST_KEY
    // поза mock-режимом локально обслуговуються лише ресурси вправ гостя
    if (!useMocks && (hasToken() || !LOCAL_PATHS.includes(url))) return fallback(config)
    const db = load(KEY)
    // невелика затримка, щоб інтерфейс показував стани збереження
    await new Promise((r) => setTimeout(r, 150))

    if (method === 'post' && url === '/exercise-series') {
      const report = body<SeriesReport>(config)
      const record: SeriesRecord = { ...report, id: db.nextId++, savedAt: new Date().toISOString() }
      db.series.unshift(record)
      save(KEY, db)
      return respond(config, 201, record)
    }
    if (method === 'get' && url === '/exercise-series/my') return respond(config, 200, db.series)
    if (method === 'get' && url === '/calibrations/latest') return respond(config, 200, db.calibrations[0] ?? null)
    if (method === 'post' && url === '/calibrations') {
      const record = { ...body<CalibrationRecord>(config), id: db.nextId++ }
      db.calibrations.unshift(record)
      save(KEY, db)
      return respond(config, 201, record)
    }
    if (method === 'get' && url === '/exercise-settings/my') return respond(config, 200, DEFAULT_EXERCISE_SETTINGS)
    // індикатор «у мережі» в заголовку
    if (useMocks && method === 'get' && url === '/auth/ping') return respond(config, 200, 'pong')
    return fallback(config)
  }
}

/** Mock-режим увімкнено змінною VITE_USE_MOCKS=true */
export const useMocks = import.meta.env.VITE_USE_MOCKS === 'true'

export function installMockAdapter(instance: AxiosInstance): void {
  const fallback = getAdapter(instance.defaults.adapter ?? ['xhr', 'http', 'fetch'])
  instance.defaults.adapter = createMockAdapter(fallback)
  if (useMocks) console.info('API: увімкнено mock-адаптер (VITE_USE_MOCKS=true)')
}
