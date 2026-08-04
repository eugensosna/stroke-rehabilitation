import type { MotionResult, Point2D } from "@/types/game";


export class WristTracker {
  private isMoving: boolean = false;
  private motionStart: Point2D | null = null;
  private lastPoint: Point2D | null = null;

  // Масив для збереження всіх завершених рухів
  private motionsHistory: MotionResult[] = [];

  private moveThreshold: number;
  private stillnessThreshold: number;
  private stationaryIntervalMs: number = 1000;
  private lastStationaryReportTime: number = 0;

  private onMotionComplete: (result: MotionResult) => void;
  private onStationary: (point: Point2D) => void;

  constructor(
    onMotionComplete: (result: MotionResult) => void,
    onStationary: (point: Point2D) => void,
    moveThreshold: number = 0.02,
    stillnessThreshold: number = 0.005
  ) {
    this.onMotionComplete = onMotionComplete;
    this.onStationary = onStationary;
    this.moveThreshold = moveThreshold;
    this.stillnessThreshold = stillnessThreshold;
  }

  public update(x: number, y: number): void {
    const current: Point2D = {
      x,
      y,
      timestamp: performance.now()
    };

    if (!this.lastPoint) {
      this.lastPoint = current;
      return;
    }

    const distance = this.calculateDistance(this.lastPoint, current);
    const now = current.timestamp;

    if (!this.isMoving) {
      if (distance >= this.moveThreshold) {
        this.isMoving = true;
        this.motionStart = this.lastPoint;
      } else {
        if (distance <= this.stillnessThreshold) {
          if (now - this.lastStationaryReportTime >= this.stationaryIntervalMs) {
            this.lastStationaryReportTime = now;
            this.onStationary(current);
          }
        }
      }
    } else {
      if (distance < this.stillnessThreshold) {
        if (this.motionStart) {
          const durationMs = current.timestamp - this.motionStart.timestamp;
          const totalDistance = this.calculateDistance(this.motionStart, this.lastPoint);

          // Захист від ділення на нуль, якщо тривалість 0 мс
          const speed = durationMs > 0 ? totalDistance / durationMs : 0;

          const motionResult: MotionResult = {
            startPoint: this.motionStart,
            endPoint: this.lastPoint,
            durationMs,
            distance: totalDistance,
            speed
          };

          // Зберігаємо в історію
          this.motionsHistory.push(motionResult);

          // Викликаємо колбек
          this.onMotionComplete(motionResult);
        }

        this.isMoving = false;
        this.motionStart = null;
        this.lastStationaryReportTime = now;
      }
    }

    this.lastPoint = current;
  }

  // ==========================================
  // АНАЛІТИЧНІ МЕТОДИ ДЛЯ РОЗРАХУНКУ
  // ==========================================

  /** Повертає всі збережені рухи */
  public getHistory(): MotionResult[] {
    return this.motionsHistory;
  }

  /** Очистити історію рухів */
  public clearHistory(): void {
    this.motionsHistory = [];
  }

  /** Найдовший рух (за дистанцією) */
  public getLongestMotion(): MotionResult | null {
    if (this.motionsHistory.length === 0) return null;
    return this.motionsHistory.reduce((max, current) =>
      current.distance > max.distance ? current : max
    );
  }

  /** Найшвидший рух */
  public getFastestMotion(): MotionResult | null {
    if (this.motionsHistory.length === 0) return null;
    return this.motionsHistory.reduce((max, current) =>
      current.speed > max.speed ? current : max
    );
  }

  /** Середня довжина всіх рухів */
  public getAverageDistance(): number {
    if (this.motionsHistory.length === 0) return 0;
    const sum = this.motionsHistory.reduce((acc, curr) => acc + curr.distance, 0);
    return sum / this.motionsHistory.length;
  }

  /** Середня швидкість руху */
  public getAverageSpeed(): number {
    if (this.motionsHistory.length === 0) return 0;
    const sum = this.motionsHistory.reduce((acc, curr) => acc + curr.speed, 0);
    return sum / this.motionsHistory.length;
  }

  private calculateDistance(p1: Point2D, p2: Point2D): number {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
}
