/**
 * Нормування на розмір кисті (підрозділ «Нормування на розмір кисті»).
 */
import { dist, mcpIndex, WRIST, type Vec3 } from './coords'

/**
 * Масштабний множник кисті s = ‖P9 − P0‖ (формула масштабного множника):
 * відстань від зап'ястка до п'ястково-фалангового суглоба середнього пальця.
 */
export function handScale(P: readonly Vec3[]): number {
  return dist(P[mcpIndex(3)], P[WRIST])
}
