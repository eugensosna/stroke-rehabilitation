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

// Рух, що відправляється на сервер. Координати нормалізовані (0..1).
export interface GameMotionRecord {
  startOffsetMs: number; // зсув від початку сесії
  durationMs: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

export interface GameSessionRequest {
  gameName: string;
  start: string; // ISO-8601
  durationMs: number;
  motions: GameMotionRecord[];
}

export interface GameSessionResponse {
  id: number;
  gameName: string;
  start: string;
  duration: number; // секунди
  motionsCount: number;
  totalDistance: number;
  averageDistance: number;
  maxDistance: number;
  averageSpeed: number;
  maxSpeed: number;
}
