export interface Brick {
  x: number
  y: number
  width: number
  height: number
  color: string
}

export interface Paddle {
  x: number
  y: number
  width: number
  height: number
  dx: number
}

export interface Ball {
  x: number
  y: number
  width: number
  height: number
  speed: number
  dx: number
  dy: number
}

export interface GameState {
  playing: boolean
  bricks: Brick[]
}
