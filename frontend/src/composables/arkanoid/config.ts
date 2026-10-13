import type { CameraMode, Difficulty, DifficultyConfig } from '@/types/arkanoid'

export const W = 800
export const H = 600

export const DIFFICULTIES: Record<Difficulty, DifficultyConfig> = {
  easy: { label: 'Легкий', ballSpeed: 4.2, speedupPerLevel: 0.06, paddleWidth: 140, lives: 5, color: '#34d399' },
  normal: { label: 'Середній', ballSpeed: 5.4, speedupPerLevel: 0.12, paddleWidth: 110, lives: 3, color: '#fbbf24' },
  hard: { label: 'Важкий', ballSpeed: 6.6, speedupPerLevel: 0.2, paddleWidth: 85, lives: 2, color: '#f87171' },
}

export const ROWS = 6
export const COLS = 12
export const BRICK_TOP = 70
export const BRICK_H = 22
export const BRICK_GAP = 6
export const BRICK_W = (W - BRICK_GAP * (COLS + 1)) / COLS
export const BRICK_POINTS = [70, 60, 50, 40, 30, 20]
export const PADDLE_Y = H - 34
export const PADDLE_H = 14
export const PADDLE_KEY_SPEED = 9
export const MAX_BALLS = 9 // ліміт одночасних м'ячів: 1 → 3 → 9 (потроювання кожного м'яча на екрані)
export const WAVES = 3

export const ROW_COLORS = [
  { main: '#f472b6', glow: '#fda4cf' },
  { main: '#fb7185', glow: '#fda4af' },
  { main: '#fb923c', glow: '#fdba8c' },
  { main: '#facc15', glow: '#fde68a' },
  { main: '#4ade80', glow: '#86efac' },
  { main: '#38bdf8', glow: '#7dd3fc' },
]

export const CAM_MODE_LABELS: Record<CameraMode, string> = {
  off: '📷 Камера: вимк.',
  'canvas-bg': '🖼 Камера: фон',
  float: '🪟 Камера: вікно',
}
