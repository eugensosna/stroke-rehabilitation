export type Difficulty = 'easy' | 'normal' | 'hard'
export type GameScreen = 'menu' | 'playing' | 'paused' | 'gameover' | 'win'
export type BonusType = 'bigball' | 'multiball'
export type CameraMode = 'off' | 'canvas-bg' | 'float'

export interface Ball {
  x: number
  y: number
  vx: number
  vy: number
  r: number
}

export interface Brick {
  x: number
  y: number
  w: number
  h: number
  row: number
  col: number
  color: string
  points: number
  alive: boolean
  bonus: BonusType | null
}

export interface Bonus {
  x: number
  y: number
  vy: number
  type: BonusType
}

export interface Paddle {
  x: number
  w: number
}

export interface DifficultyConfig {
  label: string
  ballSpeed: number
  speedupPerLevel: number // множник пришвидшення за кожну хвилю
  paddleWidth: number
  lives: number
  color: string
}
