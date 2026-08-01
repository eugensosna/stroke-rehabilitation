import { reactive } from "vue";
import type {
  Ball,
  Brick,
  Paddle,
  GameState,
  Point2D,
} from "@/types/game";


const brickGap = 2;
const brickWidth = 28;
const brickHeight = 12;
const wallSize = 12;
const baseSpeed = 3;

const level1: string[][] = [
  [],
  [],
  [],
  [],
  [],
  [],
  Array(14).fill("R"),
  Array(14).fill("R"),
  Array(14).fill("O"),
  Array(14).fill("O"),
  Array(14).fill("G"),
  Array(14).fill("G"),
  Array(14).fill("Y"),
  Array(14).fill("Y"),
];

const colorMap: Record<string, string> = {
  R: "red",
  O: "orange",
  G: "green",
  Y: "yellow",
};

export class GameArkade {
  public state: GameState;
  public paddle: Paddle;
  public ball: Ball;
  private canvas: HTMLCanvasElement;
  private handPoint: Point2D | null;
  // private canvas: CanvasRenderingContext2D;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.handPoint = null;

    const bricks: Brick[] = [];

    for (let row = 0; row < level1.length; row++) {
      for (let col = 0; col < level1[row].length; col++) {
        bricks.push({
          x: wallSize + (brickWidth + brickGap) * col,
          y: wallSize + (brickHeight + brickGap) * row,
          width: brickWidth,
          height: brickHeight,
          color: colorMap[level1[row][col]],
        });
      }
    }

    this.state = reactive<GameState>({
      playing: false,
      bricks,
    });

    this.paddle = reactive({
      x: canvas.width / 2 - 45,
      y: 440,
      width: 90,
      height: brickHeight,
      dx: 0,
    });

    this.ball = reactive({
      x: 130,
      y: 260,
      width: 7,
      height: 7,
      speed: baseSpeed,
      dx: 0,
      dy: 0,
    });
  }

  private collides(
    obj1: { x: number; y: number; width: number; height: number },
    obj2: { x: number; y: number; width: number; height: number }
  ): boolean {
    return (
      obj1.x < obj2.x + obj2.width &&
      obj1.x + obj1.width > obj2.x &&
      obj1.y < obj2.y + obj2.height &&
      obj1.y + obj1.height > obj2.y
    );
  }

  public movePaddle(point: Point2D): void {
    this.handPoint = point;
    const handPercentX: number  = point.x;
    const target = (handPercentX * this.canvas.width) / 100;

    this.paddle.x = target - this.paddle.width / 2;

    if (this.paddle.x < wallSize) {
      this.paddle.x = wallSize;
    }

    if (this.paddle.x + this.paddle.width > this.canvas.width - wallSize) {
      this.paddle.x = this.canvas.width - wallSize - this.paddle.width;
    }
  }

  public startGame(): void {
    this.state.playing = true;

    if (this.ball.dx === 0 && this.ball.dy === 0) {
      this.ball.dx = this.ball.speed;
      this.ball.dy = this.ball.speed;
    }
  }

  public resetBall(): void {
    this.ball.x = 130;
    this.ball.y = 260;
    this.ball.dx = 0;
    this.ball.dy = 0;
  }

  public updatePhysics(): void {
    if (!this.state.playing) return;

    this.ball.x += this.ball.dx;
    this.ball.y += this.ball.dy;

    if (this.ball.x < wallSize) {
      this.ball.x = wallSize;
      this.ball.dx *= -1;
    }

    if (this.ball.x + this.ball.width > this.canvas.width - wallSize) {
      this.ball.x = this.canvas.width - wallSize - this.ball.width;
      this.ball.dx *= -1;
    }

    if (this.ball.y < wallSize) {
      this.ball.y = wallSize;
      this.ball.dy *= -1;
    }

    if (this.ball.y > this.canvas.height) {
      this.resetBall();
      return;
    }

    if (this.collides(this.ball, this.paddle)) {
      this.ball.dy *= -1;
      this.ball.y = this.paddle.y - this.ball.height;
    }

    for (let i = 0; i < this.state.bricks.length; i++) {
      const brick = this.state.bricks[i];

      if (this.collides(this.ball, brick)) {
        this.state.bricks.splice(i, 1);

        if (
          this.ball.y + this.ball.height - this.ball.speed <= brick.y ||
          this.ball.y >= brick.y + brick.height - this.ball.speed
        ) {
          this.ball.dy *= -1;
        } else {
          this.ball.dx *= -1;
        }

        break;
      }
    }
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.fillStyle = "lightgrey";

    ctx.fillRect(0, 0, this.canvas.width, wallSize);

    ctx.fillRect(0, 0, wallSize, this.canvas.height);

    ctx.fillRect(this.canvas.width - wallSize, 0, wallSize, this.canvas.height);

    this.state.bricks.forEach((brick) => {
      ctx.fillStyle = brick.color;
      ctx.fillRect(brick.x, brick.y, brick.width, brick.height);
    });

    ctx.fillStyle = "cyan";

    ctx.fillRect(this.paddle.x, this.paddle.y, this.paddle.width, this.paddle.height);

    ctx.fillStyle = "white";

    ctx.fillRect(this.ball.x, this.ball.y, this.ball.width, this.ball.height);

    if (this.handPoint){

      const centerX = ((this.handPoint.x)) * this.canvas.width
      const centerY = ((this.handPoint.y)) * this.canvas.height
      ctx.beginPath();


      ctx.arc(centerX, centerY, 5, 0, 2 * Math.PI);
      ctx.lineWidth=4;
      ctx.strokeStyle = '#ff0000';
      ctx.stroke();
    }

    ctx.strokeStyle = "cyan";
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 5]);

    ctx.beginPath();
    ctx.moveTo(0, 400);
    ctx.lineTo(this.canvas.width, 400);


    ctx.stroke();
  }
}

export function useGame(canvas: HTMLCanvasElement) {
  return new GameArkade(canvas);
}
