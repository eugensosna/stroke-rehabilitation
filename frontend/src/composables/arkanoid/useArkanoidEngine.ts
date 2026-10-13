import { computed, onMounted, onUnmounted, ref, watch, type Ref } from 'vue'
import type { Ball, Bonus, BonusType, Brick, Difficulty, GameScreen, Paddle } from '@/types/arkanoid'
import {
  BRICK_GAP,
  BRICK_H,
  BRICK_POINTS,
  BRICK_TOP,
  BRICK_W,
  COLS,
  DIFFICULTIES,
  H,
  MAX_BALLS,
  PADDLE_H,
  PADDLE_KEY_SPEED,
  PADDLE_Y,
  ROW_COLORS,
  ROWS,
  W,
  WAVES,
} from './config'
import { drawArkanoid, type SceneLayers } from './drawArkanoid'
import { useArkanoidAudio } from './useArkanoidAudio'

export interface ArkanoidEngineOptions {
  /** -1 — вліво, 1 — вправо, 0 — клавіші не натиснуті */
  keyDirection: () => number
  /** Бажаний центр ракетки (рука або миша), null — без змін */
  paddleTarget: () => number | null
  layers?: SceneLayers
  onGameStart?: () => void
  onGameEnd?: () => void
}

// Стан гри, фізика, ігровий цикл (60 FPS через requestAnimationFrame) і малювання
export function useArkanoidEngine(canvasRef: Ref<HTMLCanvasElement | null>, options: ArkanoidEngineOptions) {
  const screen = ref<GameScreen>('menu')
  const difficulty = ref<Difficulty>('normal')
  const score = ref(0)
  const lives = ref(3)
  const bricksLeft = ref(0)
  const wave = ref(0)
  const fps = ref(60)

  const diffConfig = computed(() => DIFFICULTIES[difficulty.value])
  const ballSpeed = computed(() => diffConfig.value.ballSpeed * (1 + wave.value * diffConfig.value.speedupPerLevel))

  const audio = useArkanoidAudio(() => screen.value === 'playing')
  const { sfx } = audio

  // Ігрові об'єкти (нереактивні, змінюються щокадру)
  const paddle: Paddle = { x: W / 2 - 55, w: DIFFICULTIES.normal.paddleWidth }
  const balls: Ball[] = []
  const bonuses: Bonus[] = []
  const bricks: Brick[] = []

  let ctx: CanvasRenderingContext2D | null = null
  let rafId = 0
  let lastTime = 0
  let ballStuck = true

  // -------------------------------------------------------------------------
  // Побудова рівня
  // -------------------------------------------------------------------------
  function buildBricks() {
    bricks.length = 0
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        // ~18% цеглинок несуть бонус
        const roll = Math.random()
        let bonus: BonusType | null = null
        if (roll < 0.07) bonus = 'bigball'
        else if (roll < 0.18) bonus = 'multiball'
        bricks.push({
          x: BRICK_GAP + col * (BRICK_W + BRICK_GAP),
          y: BRICK_TOP + row * (BRICK_H + BRICK_GAP),
          w: BRICK_W,
          h: BRICK_H,
          row,
          col,
          color: ROW_COLORS[row % ROW_COLORS.length].main,
          points: BRICK_POINTS[row % BRICK_POINTS.length],
          alive: true,
          bonus,
        })
      }
    }
    bricksLeft.value = bricks.length
  }

  // -------------------------------------------------------------------------
  // Життєвий цикл гри
  // -------------------------------------------------------------------------
  function resetPaddle() {
    paddle.w = diffConfig.value.paddleWidth
    paddle.x = (W - paddle.w) / 2
  }

  function resetBall(ball: Ball, speed: number) {
    ball.x = paddle.x + paddle.w / 2
    ball.y = PADDLE_Y - 12
    const ang = -Math.PI / 2 + (Math.random() - 0.5) * 0.6
    ball.vx = Math.cos(ang) * speed
    ball.vy = Math.sin(ang) * speed
    ball.r = 10
  }

  /** Один м'яч, що лежить на ракетці */
  function placeStuckBall() {
    balls.length = 0
    balls.push({ x: paddle.x + paddle.w / 2, y: PADDLE_Y - 12, vx: 0, vy: 0, r: 10 })
    ballStuck = true
  }

  function startGame() {
    options.onGameStart?.()
    score.value = 0
    lives.value = diffConfig.value.lives
    resetPaddle()
    bonuses.length = 0
    buildBricks()
    placeStuckBall()
    screen.value = 'playing'
    audio.ensureAudio()
    if (audio.musicOn.value) audio.startMusic()
  }

  function endGame(result: 'gameover' | 'win') {
    screen.value = result
    audio.stopMusic()
    if (result === 'win') sfx.win()
    else sfx.lose()
    options.onGameEnd?.()
  }

  function launch() {
    if (screen.value === 'playing' && ballStuck && balls.length > 0) {
      resetBall(balls[0], ballSpeed.value)
      ballStuck = false
    } else if (screen.value === 'menu' || screen.value === 'gameover' || screen.value === 'win') {
      startGame()
    }
  }

  /** Space: запуск м'яча / нова гра / продовжити */
  function primaryAction() {
    if (screen.value === 'paused') togglePause()
    else launch()
  }

  function loseLife() {
    lives.value--
    if (lives.value <= 0) endGame('gameover')
    else placeStuckBall()
  }

  function rebuildWall() {
    buildBricks()
    bonuses.length = 0
    placeStuckBall()
  }

  function togglePause() {
    if (screen.value === 'playing') {
      screen.value = 'paused'
      audio.stopMusic()
    } else if (screen.value === 'paused') {
      screen.value = 'playing'
      if (audio.musicOn.value) audio.startMusic()
      lastTime = performance.now()
    }
  }

  function backToMenu() {
    screen.value = 'menu'
    audio.stopMusic()
    options.onGameEnd?.()
    balls.length = 0
    bonuses.length = 0
  }

  // -------------------------------------------------------------------------
  // Оновлення світу
  // -------------------------------------------------------------------------
  function updatePaddle() {
    // Клавіші мають пріоритет; інакше — рука або миша
    const dir = options.keyDirection()
    if (dir !== 0) {
      paddle.x += dir * PADDLE_KEY_SPEED
    } else {
      const target = options.paddleTarget()
      if (target !== null) paddle.x = target - paddle.w / 2
    }
    paddle.x = Math.max(0, Math.min(W - paddle.w, paddle.x))

    if (ballStuck && balls.length > 0) {
      balls[0].x = paddle.x + paddle.w / 2
      balls[0].y = PADDLE_Y - 12
    }
  }

  function hitBrick(nx: number, ny: number, b: Ball) {
    for (const brick of bricks) {
      if (!brick.alive) continue
      if (nx + b.r > brick.x && nx - b.r < brick.x + brick.w && ny + b.r > brick.y && ny - b.r < brick.y + brick.h) {
        brick.alive = false
        bricksLeft.value--
        score.value += brick.points
        sfx.brick()
        if (brick.bonus) {
          bonuses.push({ x: brick.x + brick.w / 2, y: brick.y + brick.h / 2, vy: 2.2, type: brick.bonus })
        }
        // Визначаємо сторону відбиття
        const overlapX = Math.min(nx + b.r - brick.x, brick.x + brick.w - (nx - b.r))
        const overlapY = Math.min(ny + b.r - brick.y, brick.y + brick.h - (ny - b.r))
        if (overlapX < overlapY) b.vx = -b.vx
        else b.vy = -b.vy
        return
      }
    }
  }

  /** false — гра завершилась під час оновлення */
  function updateBalls(step: number): boolean {
    const baseSpeed = ballSpeed.value
    for (let i = balls.length - 1; i >= 0; i--) {
      const b = balls[i]
      if (ballStuck && b === balls[0]) continue

      let nx = b.x + b.vx * step
      let ny = b.y + b.vy * step

      // Стіни
      if (nx - b.r < 0) {
        nx = b.r
        b.vx = Math.abs(b.vx)
        sfx.wall()
      }
      if (nx + b.r > W) {
        nx = W - b.r
        b.vx = -Math.abs(b.vx)
        sfx.wall()
      }
      if (ny - b.r < 0) {
        ny = b.r
        b.vy = Math.abs(b.vy)
        sfx.wall()
      }

      // Ракетка
      if (
        b.vy > 0 &&
        ny + b.r >= PADDLE_Y &&
        ny - b.r <= PADDLE_Y + PADDLE_H &&
        nx >= paddle.x - b.r &&
        nx <= paddle.x + paddle.w + b.r
      ) {
        ny = PADDLE_Y - b.r
        // Кут відбиття залежить від точки удару
        const hit = (nx - (paddle.x + paddle.w / 2)) / (paddle.w / 2)
        const clamped = Math.max(-1, Math.min(1, hit))
        const angle = -Math.PI / 2 + clamped * (Math.PI / 3)
        const spd = Math.max(baseSpeed * 0.6, Math.hypot(b.vx, b.vy))
        b.vx = Math.cos(angle) * spd
        b.vy = Math.sin(angle) * spd
        sfx.paddle()
      }

      hitBrick(nx, ny, b)

      // Втрата м'яча
      if (ny - b.r > H + 20) {
        balls.splice(i, 1)
        if (balls.length === 0) {
          loseLife()
          if (screen.value !== 'playing') return false
        }
        continue
      }

      b.x = nx
      b.y = ny
    }
    return true
  }

  function updateBonuses(step: number) {
    for (let i = bonuses.length - 1; i >= 0; i--) {
      const bo = bonuses[i]
      bo.y += bo.vy * step
      // Зловлено ракеткою
      if (
        bo.y + 10 >= PADDLE_Y &&
        bo.y - 10 <= PADDLE_Y + PADDLE_H &&
        bo.x >= paddle.x - 12 &&
        bo.x <= paddle.x + paddle.w + 12
      ) {
        sfx.bonus()
        applyBonus(bo.type)
        bonuses.splice(i, 1)
        continue
      }
      // Пропущено
      if (bo.y > H + 20) bonuses.splice(i, 1)
    }
  }

  function applyBonus(type: BonusType) {
    if (type === 'bigball') {
      for (const b of balls) {
        b.r = Math.min(24, b.r * 1.7) // збільшення радіуса у 1.5–2 рази
      }
      return
    }
    // multiball: якщо м'яч ще на ракетці — спершу запускаємо його
    if (ballStuck && balls.length > 0) {
      ballStuck = false
      resetBall(balls[0], ballSpeed.value)
    }
    for (const b of [...balls]) {
      const spd = Math.hypot(b.vx, b.vy) || diffConfig.value.ballSpeed
      for (const delta of [-0.5, 0.5]) {
        if (balls.length >= MAX_BALLS) break
        const ang = Math.atan2(b.vy, b.vx) + delta
        balls.push({ x: b.x, y: b.y, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd, r: b.r })
      }
    }
  }

  function update(dt: number) {
    updatePaddle()
    // dt-нормалізований крок (однакова швидкість незалежно від FPS)
    const step = dt / (1000 / 60)
    if (!updateBalls(step)) return
    updateBonuses(step)

    // Умова перемоги: усі цеглинки знищені
    if (bricksLeft.value <= 0 && screen.value === 'playing') {
      wave.value++
      // Нове коло: rebuild wall та пришвидшення, бонус рахунку
      score.value += 300
      if (wave.value >= WAVES) endGame('win')
      else rebuildWall()
    }
  }

  // -------------------------------------------------------------------------
  // Ігровий цикл
  // -------------------------------------------------------------------------
  function loop(time: number) {
    rafId = requestAnimationFrame(loop)
    const dt = Math.min(50, time - lastTime || 16)
    lastTime = time
    fps.value = Math.round(1000 / Math.max(dt, 1))

    if (screen.value === 'playing') update(dt)
    if (ctx) {
      drawArkanoid(
        ctx,
        {
          bricks,
          bonuses,
          balls,
          paddle,
          paddleColor: diffConfig.value.color,
          showLaunchHint: ballStuck && screen.value === 'playing',
        },
        options.layers,
      )
    }
  }

  function onVisibility() {
    if (document.hidden) {
      audio.stopMusic()
      if (screen.value === 'playing') screen.value = 'paused'
    }
  }

  watch(difficulty, (d) => {
    paddle.w = DIFFICULTIES[d].paddleWidth
  })

  onMounted(() => {
    const el = canvasRef.value
    if (el) {
      const dpr = window.devicePixelRatio || 1
      el.width = W * dpr
      el.height = H * dpr
      ctx = el.getContext('2d')
      if (ctx) ctx.scale(dpr, dpr)
    }
    resetPaddle()
    document.addEventListener('visibilitychange', onVisibility)
    // Стартовий кадр у меню
    buildBricks()
    lastTime = performance.now()
    rafId = requestAnimationFrame(loop)
  })

  onUnmounted(() => {
    // користувач пішов зі сторінки посеред гри — не втрачаємо статистику
    options.onGameEnd?.()
    cancelAnimationFrame(rafId)
    document.removeEventListener('visibilitychange', onVisibility)
  })

  return {
    screen,
    difficulty,
    diffConfig,
    score,
    lives,
    wave,
    fps,
    ballSpeed,
    sfxOn: audio.sfxOn,
    musicOn: audio.musicOn,
    startGame,
    launch,
    primaryAction,
    togglePause,
    backToMenu,
  }
}
