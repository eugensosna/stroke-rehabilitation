/**
 * Система координат (підрозділ «Система координат», формула ізотропних координат).
 */
import type { Finger } from './config'

/** Точка в тривимірному просторі */
export interface Vec3 {
  x: number
  y: number
  z: number
}

/** Кількість ключових точок кисті MediaPipe */
export const LANDMARK_COUNT = 21
/** Зап'ясток */
export const WRIST = 0

/** Кінчик k-го пальця: точка 4k */
export const tipIndex = (k: Finger): number => 4 * k
/** П'ястково-фаланговий суглоб пальця k ≥ 2 (для великого — точка 1): 4k − 3 */
export const mcpIndex = (k: Finger): number => 4 * k - 3

/**
 * Ізотропні координати P_i = (x_i·W, y_i·H, z_i·W) (формула ізотропних координат).
 * @param landmarks нормовані координати MediaPipe (21 точка)
 * @param W ширина кадру, пікс.
 * @param H висота кадру, пікс.
 */
export function toIsotropic(landmarks: readonly Vec3[], W: number, H: number): Vec3[] {
  return landmarks.map((p) => ({ x: p.x * W, y: p.y * H, z: p.z * W }))
}

/** Різниця векторів a − b */
export const sub = (a: Vec3, b: Vec3): Vec3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z })
/** Скалярний добуток */
export const dot = (a: Vec3, b: Vec3): number => a.x * b.x + a.y * b.y + a.z * b.z
/** Евклідова норма ‖a‖ */
export const norm = (a: Vec3): number => Math.hypot(a.x, a.y, a.z)
/** Відстань ‖a − b‖ */
export const dist = (a: Vec3, b: Vec3): number => norm(sub(a, b))
/** Відстань у площині зображення (без z) */
export const dist2d = (a: Vec3, b: Vec3): number => Math.hypot(a.x - b.x, a.y - b.y)
