/**
 * Демонстраційне джерело кадрів (лише dev, параметр `?demo=1`): синтетична кисть виконує рух,
 * потрібний поточному кроку калібрування або вправі. Для розробки інтерфейсу і перевірки
 * повного сценарію без вебкамери. У робочій збірці не використовується.
 */
import type { Landmark } from '@/types/landmarks'
import { syntheticHand, type SyntheticHandParams } from './syntheticHand'

export interface DemoIntent {
  kind: 'rest' | 'open' | 'pinch' | 'touch' | 'flex' | 'point' | 'sweep'
  /** Палець для touch/flex */
  k?: number
}

const intent: DemoIntent = { kind: 'rest' }

export function isDemoMode(): boolean {
  if (!import.meta.env.DEV) return false
  return new URLSearchParams(window.location.search).get('demo') === '1'
}

export function setDemoIntent(next: DemoIntent): void {
  intent.kind = next.kind
  intent.k = next.k
}

/** Фаза руху: 0 — вихідне положення, 1 — максимальний рух (цикл 3,2 с) */
function phase(t: number): number {
  const c = t % 3.2
  if (c < 0.8) return 0
  if (c < 1.4) return (c - 0.8) / 0.6
  if (c < 2.6) return 1
  return 1 - (c - 2.6) / 0.6
}

export function demoLandmarks(t: number, W: number, H: number): Landmark[] {
  const a = phase(t)
  const p: SyntheticHandParams = {
    W,
    H,
    size: H * 0.24,
    cx: 0.5 + 0.18 * Math.sin(t * 0.5),
    cy: 0.78,
    noise: 0.5,
  }
  switch (intent.kind) {
    case 'open': {
      const f = 1 - a
      p.flex = { 1: f, 2: f, 3: f, 4: f, 5: f }
      break
    }
    case 'pinch':
      p.thumbTo = { k: 2, amount: a }
      break
    case 'touch':
      p.thumbTo = { k: (intent.k ?? 2) as 2 | 3 | 4 | 5, amount: a }
      break
    case 'flex':
      p.flex = { [intent.k ?? 2]: a }
      break
    case 'sweep':
      // розслаблена кисть ходить ліворуч-праворуч
      p.flex = { 1: 0.1, 2: 0.1, 3: 0.1, 4: 0.1, 5: 0.1 }
      p.cx = 0.5 + 0.28 * Math.sin(t * 1.1)
      break
    case 'point':
      // прямий вказівний, інші зігнуті; кисть водить пальцем і «натискає» наближенням (+35 % розміру)
      p.flex = { 1: 0.6, 2: 0, 3: 1, 4: 1, 5: 1 }
      p.cx = 0.5 + 0.1 * Math.sin(t * 0.7)
      p.cy = 0.85 + 0.06 * Math.sin(t * 0.43)
      p.size = H * 0.2 * (1 + 0.35 * a)
      break
    default:
      p.flex = { 1: 0.1, 2: 0.1, 3: 0.1, 4: 0.1, 5: 0.1 }
  }
  return syntheticHand(p)
}
