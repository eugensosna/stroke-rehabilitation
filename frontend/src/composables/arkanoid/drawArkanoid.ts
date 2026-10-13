import type { Ball, Bonus, Brick, Paddle } from '@/types/arkanoid'
import { H, PADDLE_H, PADDLE_Y, ROW_COLORS, W } from './config'

export interface ArkanoidScene {
  bricks: Brick[]
  bonuses: Bonus[]
  balls: Ball[]
  paddle: Paddle
  paddleColor: string
  showLaunchHint: boolean
}

/** Додаткові шари, які малює не сам рушій (веб-камера, маркер руки) */
export interface SceneLayers {
  background?: (c: CanvasRenderingContext2D) => void
  afterPaddle?: (c: CanvasRenderingContext2D) => void
}

function drawBricks(c: CanvasRenderingContext2D, bricks: Brick[]) {
  for (const brick of bricks) {
    if (!brick.alive) continue
    const glow = ROW_COLORS[brick.row % ROW_COLORS.length].glow
    c.fillStyle = brick.color
    c.fillRect(brick.x, brick.y, brick.w, brick.h)
    c.fillStyle = glow
    c.fillRect(brick.x, brick.y, brick.w, 6)
    c.fillStyle = 'rgba(0,0,0,0.25)'
    c.fillRect(brick.x, brick.y + brick.h - 5, brick.w, 5)
    // Бонусні цеглинки позначені шевроном
    if (brick.bonus) {
      c.fillStyle = 'rgba(255,255,255,0.9)'
      c.fillRect(brick.x + brick.w / 2 - 7, brick.y + brick.h / 2 - 1.5, 14, 3)
      c.fillRect(brick.x + brick.w / 2 - 3, brick.y + brick.h / 2 - 5, 6, 3)
      c.fillRect(brick.x + brick.w / 2 - 3, brick.y + brick.h / 2 + 3, 6, 3)
    }
  }
}

function drawBonuses(c: CanvasRenderingContext2D, bonuses: Bonus[]) {
  for (const bo of bonuses) {
    c.save()
    c.shadowColor = bo.type === 'bigball' ? '#f472b6' : '#38bdf8'
    c.shadowBlur = 12
    c.fillStyle = bo.type === 'bigball' ? '#f9a8d4' : '#7dd3fc'
    c.beginPath()
    c.arc(bo.x, bo.y, 11, 0, Math.PI * 2)
    c.fill()
    c.shadowBlur = 0
    c.fillStyle = '#0b1026'
    c.font = 'bold 11px monospace'
    c.textAlign = 'center'
    c.textBaseline = 'middle'
    c.fillText(bo.type === 'bigball' ? 'B' : '×3', bo.x, bo.y + 1)
    c.restore()
  }
}

function drawPaddle(c: CanvasRenderingContext2D, paddle: Paddle, color: string) {
  const paddleGrad = c.createLinearGradient(paddle.x, PADDLE_Y, paddle.x, PADDLE_Y + PADDLE_H)
  paddleGrad.addColorStop(0, color)
  paddleGrad.addColorStop(1, 'rgba(255,255,255,0.25)')
  c.shadowColor = color
  c.shadowBlur = 16
  c.fillStyle = paddleGrad
  c.beginPath()
  c.roundRect(paddle.x, PADDLE_Y, paddle.w, PADDLE_H, 7)
  c.fill()
  c.shadowBlur = 0
}

function drawBalls(c: CanvasRenderingContext2D, balls: Ball[]) {
  for (const b of balls) {
    c.save()
    c.shadowColor = '#fff'
    c.shadowBlur = 14
    c.fillStyle = '#f8fafc'
    c.beginPath()
    c.arc(b.x, b.y, b.r, 0, Math.PI * 2)
    c.fill()
    c.restore()
  }
}

export function drawArkanoid(c: CanvasRenderingContext2D, scene: ArkanoidScene, layers: SceneLayers = {}) {
  // Фон (градієнт)
  const grad = c.createLinearGradient(0, 0, 0, H)
  grad.addColorStop(0, '#0b1026')
  grad.addColorStop(1, '#1a1f3a')
  c.fillStyle = grad
  c.fillRect(0, 0, W, H)

  // Веб-камера як напівпрозорий фон (перед ігровими об'єктами)
  layers.background?.(c)

  // Верхня панель тіні
  c.fillStyle = 'rgba(255,255,255,0.02)'
  c.fillRect(0, 0, W, 6)

  drawBricks(c, scene.bricks)
  drawBonuses(c, scene.bonuses)
  drawPaddle(c, scene.paddle, scene.paddleColor)
  layers.afterPaddle?.(c)
  drawBalls(c, scene.balls)

  // Підказка, коли м'яч на ракетці
  if (scene.showLaunchHint) {
    c.fillStyle = 'rgba(255,255,255,0.5)'
    c.font = '16px system-ui, sans-serif'
    c.textAlign = 'center'
    c.fillText('Клікніть або натисніть Space, щоб запустити м’яч', W / 2, H - 90)
  }
}
