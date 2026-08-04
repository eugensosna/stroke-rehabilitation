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

export interface Point2D {
  x: number;
  y: number;
  timestamp: number; // у мілісекундах
}


export interface Point3D {
  x: number;
  y: number;
  z: number;
  timestamp: number; // у мілісекундах
}


export interface MotionResult {
  startPoint: Point2D;
  endPoint: Point2D;
  durationMs: number;
  distance: number;       // довжина руху
  speed: number;          // швидкість (distance / durationMs)
}
