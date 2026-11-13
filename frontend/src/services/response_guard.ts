/**
 * Перевірка форми відповіді API. Якщо бекенд ще не має ендпоінта, сервер (або SPA-fallback)
 * може відповісти 200 з index.html — такі дані не можна передавати далі як JSON.
 */
export const isRecord = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === 'object' && !Array.isArray(v)

export function unexpectedResponse(url: string, data: unknown): Error {
  const kind = typeof data === 'string' && /^\s*</.test(data) ? 'HTML-сторінка (ендпоінт не реалізовано?)' : typeof data
  return new Error(`Неочікувана відповідь ${url}: ${kind}`)
}
