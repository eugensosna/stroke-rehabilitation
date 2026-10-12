<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'

// ---------------------------------------------------------------------------
// Типи
// ---------------------------------------------------------------------------
type Difficulty = 'easy' | 'normal' | 'hard'
type GameScreen = 'menu' | 'playing' | 'paused' | 'gameover' | 'win'
type BonusType = 'bigball' | 'multiball'
type CameraMode = 'off' | 'canvas-bg' | 'float'

interface Ball {
  x: number
  y: number
  vx: number
  vy: number
  r: number
}

interface Brick {
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

interface Bonus {
  x: number
  y: number
  vy: number
  type: BonusType
}

interface DifficultyConfig {
  label: string
  ballSpeed: number
  speedupPerLevel: number // множник пришвидшення за кожну хвилю
  paddleWidth: number
  lives: number
  color: string
}

// ---------------------------------------------------------------------------
// Конфігурація
// ---------------------------------------------------------------------------
const W = 800
const H = 600

const DIFFICULTIES: Record<Difficulty, DifficultyConfig> = {
  easy: { label: 'Легкий', ballSpeed: 4.2, speedupPerLevel: 0.06, paddleWidth: 140, lives: 5, color: '#34d399' },
  normal: { label: 'Середній', ballSpeed: 5.4, speedupPerLevel: 0.12, paddleWidth: 110, lives: 3, color: '#fbbf24' },
  hard: { label: 'Важкий', ballSpeed: 6.6, speedupPerLevel: 0.2, paddleWidth: 85, lives: 2, color: '#f87171' },
}

const ROWS = 6
const COLS = 12
const BRICK_TOP = 70
const BRICK_H = 22
const BRICK_GAP = 6
const BRICK_W = (W - BRICK_GAP * (COLS + 1)) / COLS
const PADDLE_Y = H - 34
const PADDLE_H = 14
const MAX_BALLS = 9 // ліміт одночасних м'ячів: 1 → 3 → 9 (потроювання кожного м'яча на екрані)

const ROW_COLORS = [
  { main: '#f472b6', glow: '#fda4cf' },
  { main: '#fb7185', glow: '#fda4af' },
  { main: '#fb923c', glow: '#fdba8c' },
  { main: '#facc15', glow: '#fde68a' },
  { main: '#4ade80', glow: '#86efac' },
  { main: '#38bdf8', glow: '#7dd3fc' },
]

// ---------------------------------------------------------------------------
// Реактивний стан (UI)
// ---------------------------------------------------------------------------
const canvas = ref<HTMLCanvasElement | null>(null)
const videoEl = ref<HTMLVideoElement | null>(null)
const screen = ref<GameScreen>('menu')
const musicOn = ref(true)
const sfxOn = ref(true)
const difficulty = ref<Difficulty>('normal')

const score = ref(0)
const lives = ref(3)
const bricksLeft = ref(0)
const wave = ref(0)
const fps = ref(60)

const diffConfig = computed(() => DIFFICULTIES[difficulty.value])

// ---------------------------------------------------------------------------
// Веб-камера
// ---------------------------------------------------------------------------
const cameraMode = ref<CameraMode>('off')
const cameraLoading = ref(false)
const cameraError = ref('')
const camOpacity = ref(0.3) // прозорість фону канваса
const camWin = ref({ x: 600, y: 400, minimized: false })
const camDragging = ref(false)
const camFloatVideo = ref<HTMLVideoElement | null>(null)

let camStream: MediaStream | null = null
let dragStart = { x: 0, y: 0, winX: 0, winY: 0 }

const CAM_MODE_LABELS: Record<CameraMode, string> = {
  off: '📷 Камера: вимк.',
  'canvas-bg': '🖼 Камера: фон',
  float: '🪟 Камера: вікно',
}

function stopCamera() {
  camStream?.getTracks().forEach((t) => t.stop())
  camStream = null
  cameraLoading.value = false
  cameraError.value = ''
}

/** Підключає потік до всіх активних video-елементів (прихований + плаваюче вікно) */
function attachStream(stream: MediaStream) {
  if (videoEl.value) {
    videoEl.value.srcObject = stream
    void videoEl.value.play().catch(() => {})
  }
  if (camFloatVideo.value) {
    camFloatVideo.value.srcObject = stream
    void camFloatVideo.value.play().catch(() => {})
  }
}

async function enableCamera() {
  cameraLoading.value = true
  cameraError.value = ''
  try {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('not-supported')
    }
    // Повторне використання активного потоку, якщо камера вже ввімкнена
    const stream = camStream ?? (await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 }, audio: false }))
    camStream = stream
    attachStream(stream)
    cameraError.value = ''
  } catch (err) {
    const name = (err as DOMException)?.name
    if (name === 'NotAllowedError') cameraError.value = 'Дозвіл на камеру не надано — гра працює без камери.'
    else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') cameraError.value = 'Камеру не знайдено — гра працює без камери.'
    else if (name === 'NotReadableError') cameraError.value = 'Камера зайнята іншою програмою — гра працює без камери.'
    else cameraError.value = 'Камера недоступна — гра працює у звичайному режимі.'
    await setCameraMode('off')
  } finally {
    cameraLoading.value = false
  }
}

async function setCameraMode(mode: CameraMode) {
  if (mode !== 'off' && !camStream) {
    cameraMode.value = mode
    await enableCamera()
    if (!camStream) {
      cameraMode.value = 'off'
      return
    }
  }
  cameraMode.value = mode
  if (mode === 'off') stopCamera()
  // Стартова позиція плаваючого віконця
  if (mode === 'float') {
    camWin.value = { x: W - 260, y: 330, minimized: false }
  }
}

// Пере-підключення потоку, коли плаваюче віконце монтується через v-if
watch(camFloatVideo, (v) => {
  if (v && camStream) {
    v.srcObject = camStream
    void v.play().catch(() => {})
  }
})

async function cycleCameraMode() {
  const order: CameraMode[] = ['off', 'canvas-bg', 'float']
  const next = order[(order.indexOf(cameraMode.value) + 1) % order.length]
  await setCameraMode(next)
}

function onCamDragStart(e: PointerEvent) {
  camDragging.value = true
  dragStart = { x: e.clientX, y: e.clientY, winX: camWin.value.x, winY: camWin.value.y }
  ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
}

function onCamDragMove(e: PointerEvent) {
  if (!camDragging.value) return
  const dx = e.clientX - dragStart.x
  const dy = e.clientY - dragStart.y
  camWin.value.x = Math.max(4, Math.min(W - 210, dragStart.winX + dx))
  camWin.value.y = Math.max(44, Math.min(H - 60, dragStart.winY + dy))
}

function onCamDragEnd() {
  camDragging.value = false
}

function toggleCamMinimized() {
  camWin.value.minimized = !camWin.value.minimized
}

onUnmounted(() => {
  stopCamera()
})

// ---------------------------------------------------------------------------
// Ігрові об'єкти (нерективні, муваються щокадру)
// ---------------------------------------------------------------------------
const paddle = { x: W / 2 - 55, w: DIFFICULTIES.normal.paddleWidth }
const balls: Ball[] = []
const bonuses: Bonus[] = []
const bricks: Brick[] = []

const keys = { left: false, right: false }
let mouseX = W / 2
let mouseMoved = false

let ctx: CanvasRenderingContext2D | null = null
let rafId = 0
let running = false
let lastTime = 0
let ballStuck = true

// ---------------------------------------------------------------------------
// Web Audio API — генератор звуків
// ---------------------------------------------------------------------------
let audioCtx: AudioContext | null = null
let musicTimer: number | null = null
let musicStep = 0

function ensureAudio(): AudioContext | null {
  if (!audioCtx) {
    try {
      audioCtx = new AudioContext()
    } catch {
      return null
    }
  }
  if (audioCtx.state === 'suspended') void audioCtx.resume()
  return audioCtx
}

function tone(
  freq: number,
  duration: number,
  type: OscillatorType,
  gainVal: number,
  when = 0,
) {
  if (!sfxOn.value) return
  const ac = ensureAudio()
  if (!ac) return
  const osc = ac.createOscillator()
  const gain = ac.createGain()
  osc.type = type
  osc.frequency.value = freq
  const t = ac.currentTime + when
  gain.gain.setValueAtTime(gainVal, t)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + duration)
  osc.connect(gain).connect(ac.destination)
  osc.start(t)
  osc.stop(t + duration + 0.02)
}

function noiseBurst(duration: number, gainVal: number) {
  if (!sfxOn.value) return
  const ac = ensureAudio()
  if (!ac) return
  const len = Math.floor(ac.sampleRate * duration)
  const buffer = ac.createBuffer(1, len, ac.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < len; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / len)
  }
  const src = ac.createBufferSource()
  src.buffer = buffer
  const filter = ac.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = 900
  const gain = ac.createGain()
  gain.gain.value = gainVal
  src.connect(filter).connect(gain).connect(ac.destination)
  src.start()
}

function sfxPaddle() {
  tone(760, 0.08, 'sine', 0.25)
}

function sfxWall() {
  tone(420, 0.05, 'triangle', 0.15)
}

function sfxBrick() {
  noiseBurst(0.12, 0.3)
  tone(260, 0.06, 'square', 0.12)
}

function sfxBonus() {
  tone(520, 0.09, 'sine', 0.2, 0)
  tone(780, 0.09, 'sine', 0.2, 0.09)
  tone(1040, 0.12, 'sine', 0.2, 0.18)
}

function sfxLose() {
  tone(330, 0.18, 'sawtooth', 0.2, 0)
  tone(220, 0.22, 'sawtooth', 0.2, 0.15)
  tone(120, 0.4, 'sawtooth', 0.25, 0.3)
}

function sfxWin() {
  const notes = [523, 659, 784, 1047]
  notes.forEach((n, i) => tone(n, 0.16, 'triangle', 0.22, i * 0.11))
}

// Фонова музика: короткий аркадний цикл на басі + арпеджіо
const BASS = [110, 110, 146.8, 110, 130.8, 130.8, 98, 98]
const ARP = [440, 554.4, 659.3, 880, 659.3, 554.4, 587.3, 740]

function musicTick() {
  if (!musicOn.value) return
  const ac = ensureAudio()
  if (!ac) return
  const step = musicStep % 8
  // Бас
  const osc = ac.createOscillator()
  const gain = ac.createGain()
  osc.type = 'square'
  osc.frequency.value = BASS[step]
  gain.gain.setValueAtTime(0.06, ac.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.22)
  osc.connect(gain).connect(ac.destination)
  osc.start()
  osc.stop(ac.currentTime + 0.24)
  // Арпеджіо через раз
  if (step % 2 === 0) {
    const o2 = ac.createOscillator()
    const g2 = ac.createGain()
    o2.type = 'triangle'
    o2.frequency.value = ARP[step]
    g2.gain.setValueAtTime(0.05, ac.currentTime)
    g2.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.16)
    o2.connect(g2).connect(ac.destination)
    o2.start()
    o2.stop(ac.currentTime + 0.18)
  }
  musicStep++
}

function startMusic() {
  if (musicTimer !== null) return
  musicStep = 0
  musicTimer = window.setInterval(musicTick, 250)
}

function stopMusic() {
  if (musicTimer !== null) {
    clearInterval(musicTimer)
    musicTimer = null
  }
}

watch(musicOn, (on) => {
  if (on && screen.value === 'playing' && !document.hidden) startMusic()
  else stopMusic()
})

// ---------------------------------------------------------------------------
// Побудова рівня
// ---------------------------------------------------------------------------
const BRICK_POINTS = [70, 60, 50, 40, 30, 20]

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
}

// ---------------------------------------------------------------------------
// Життєвий цикл гри
// ---------------------------------------------------------------------------
function resetPaddle() {
  const cfg = diffConfig.value
  paddle.w = cfg.paddleWidth
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

function currentBallSpeed() {
  const cfg = diffConfig.value
  const factor = 1 + wave.value * cfg.speedupPerLevel
  return cfg.ballSpeed * factor
}

function startGame() {
  const cfg = diffConfig.value
  score.value = 0
  lives.value = cfg.lives
  paddle.w = cfg.paddleWidth
  paddle.x = (W - paddle.w) / 2
  balls.length = 0
  bonuses.length = 0
  buildBricks()
  bricksLeft.value = bricks.filter((b) => b.alive).length
  balls.push({
    x: paddle.x + paddle.w / 2,
    y: PADDLE_Y - 12,
    vx: 0,
    vy: 0,
    r: 10,
  })
  ballStuck = true
  screen.value = 'playing'
  ensureAudio()
  if (musicOn.value) startMusic()
  if (!running) loop(performance.now())
}

function launch() {
  if (screen.value === 'playing' && ballStuck && balls.length > 0) {
    resetBall(balls[0], currentBallSpeed())
    ballStuck = false
  } else if (screen.value === 'menu' || screen.value === 'gameover' || screen.value === 'win') {
    startGame()
  }
}

function respawnBall() {
  if (lives.value <= 0) {
    screen.value = 'gameover'
    stopMusic()
    sfxLose()
    return
  }
  balls.length = 0
  balls.push({
    x: paddle.x + paddle.w / 2,
    y: PADDLE_Y - 12,
    vx: 0,
    vy: 0,
    r: 10,
  })
  ballStuck = true
}

function loseLife() {
  lives.value--
  if (lives.value <= 0) {
    screen.value = 'gameover'
    stopMusic()
    sfxLose()
  } else {
    respawnBall()
  }
}

function winLevel() {
  screen.value = 'win'
  stopMusic()
  sfxWin()
}

function rebuildWall() {
  buildBricks()
  bricksLeft.value = bricks.filter((b) => b.alive).length
  balls.length = 0
  bonuses.length = 0
  balls.push({
    x: paddle.x + paddle.w / 2,
    y: PADDLE_Y - 12,
    vx: 0,
    vy: 0,
    r: 10,
  })
  ballStuck = true
}

function togglePause() {
  if (screen.value === 'playing') {
    screen.value = 'paused'
    stopMusic()
  } else if (screen.value === 'paused') {
    screen.value = 'playing'
    if (musicOn.value) startMusic()
    lastTime = performance.now()
    if (!running) loop(performance.now())
  }
}

function backToMenu() {
  screen.value = 'menu'
  stopMusic()
  balls.length = 0
  bonuses.length = 0
}

// ---------------------------------------------------------------------------
// Оновлення світу
// ---------------------------------------------------------------------------
function update(dt: number) {
  // Ракетка: клавіатура
  const speed = 9
  if (keys.left) {
    paddle.x -= speed
    mouseMoved = false
  }
  if (keys.right) {
    paddle.x += speed
    mouseMoved = false
  }
  // Ракетка: миша (якщо не керують клавішами)
  if (mouseMoved) {
    paddle.x = mouseX - paddle.w / 2
  }
  paddle.x = Math.max(0, Math.min(W - paddle.w, paddle.x))

  if (ballStuck && balls.length > 0) {
    balls[0].x = paddle.x + paddle.w / 2
    balls[0].y = PADDLE_Y - 12
  }

  // М'ячі
  const baseSpeed = currentBallSpeed()
  for (let i = balls.length - 1; i >= 0; i--) {
    const b = balls[i]
    if (ballStuck && b === balls[0]) continue

    // dt-нормалізований крок (однакова швидкість незалежно від FPS)
    const step = dt / (1000 / 60)
    let nx = b.x + b.vx * step
    let ny = b.y + b.vy * step

    // Стіни
    if (nx - b.r < 0) {
      nx = b.r
      b.vx = Math.abs(b.vx)
      sfxWall()
    }
    if (nx + b.r > W) {
      nx = W - b.r
      b.vx = -Math.abs(b.vx)
      sfxWall()
    }
    if (ny - b.r < 0) {
      ny = b.r
      b.vy = Math.abs(b.vy)
      sfxWall()
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
      sfxPaddle()
    }

    // Цеглинки
    outer: for (const brick of bricks) {
      if (!brick.alive) continue
      if (
        nx + b.r > brick.x &&
        nx - b.r < brick.x + brick.w &&
        ny + b.r > brick.y &&
        ny - b.r < brick.y + brick.h
      ) {
        brick.alive = false
        bricksLeft.value--
        score.value += brick.points
        sfxBrick()
        if (brick.bonus) {
          bonuses.push({
            x: brick.x + brick.w / 2,
            y: brick.y + brick.h / 2,
            vy: 2.2,
            type: brick.bonus,
          })
        }
        // Визначаємо сторону відбиття
        const overlapX = Math.min(nx + b.r - brick.x, brick.x + brick.w - (nx - b.r))
        const overlapY = Math.min(ny + b.r - brick.y, brick.y + brick.h - (ny - b.r))
        if (overlapX < overlapY) b.vx = -b.vx
        else b.vy = -b.vy
        break outer
      }
    }

    // Втрата м'яча
    if (ny - b.r > H + 20) {
      balls.splice(i, 1)
      if (balls.length === 0) {
        loseLife()
        if (screen.value !== 'playing') return
      }
      continue
    }

    b.x = nx
    b.y = ny
  }

  // Бонуси падають
  for (let i = bonuses.length - 1; i >= 0; i--) {
    const bo = bonuses[i]
    bo.y += bo.vy * (dt / (1000 / 60))
    // Зловлено ракеткою
    if (
      bo.y + 10 >= PADDLE_Y &&
      bo.y - 10 <= PADDLE_Y + PADDLE_H &&
      bo.x >= paddle.x - 12 &&
      bo.x <= paddle.x + paddle.w + 12
    ) {
      sfxBonus()
      applyBonus(bo.type)
      bonuses.splice(i, 1)
      continue
    }
    // Пропущено
    if (bo.y > H + 20) {
      bonuses.splice(i, 1)
    }
  }

  // Умова перемоги: усі цеглинки знищені
  if (bricksLeft.value <= 0 && screen.value === 'playing') {
    wave.value++
    // Нове коло: rebuild wall та пришвидшення, бонус рахунку
    score.value += 300
    if (wave.value >= 3) {
      winLevel()
    } else {
      rebuildWall()
    }
  }
}

function applyBonus(type: BonusType) {
  if (type === 'bigball') {
    for (const b of balls) {
      b.r = Math.min(24, b.r * 1.7) // збільшення радіуса у 1.5–2 рази
    }
  } else if (type === 'multiball') {
    // Якщо м'яч ще на ракетці — спершу запускаємо його
    if (ballStuck && balls.length > 0) {
      ballStuck = false
      resetBall(balls[0], currentBallSpeed())
    }
    const current = [...balls]
    for (const b of current) {
      const spd = Math.hypot(b.vx, b.vy) || diffConfig.value.ballSpeed
      for (const delta of [-0.5, 0.5]) {
        if (balls.length >= MAX_BALLS) break
        const ang = Math.atan2(b.vy, b.vx) + delta
        balls.push({
          x: b.x,
          y: b.y,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd,
          r: b.r,
        })
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Малювання
// ---------------------------------------------------------------------------
function drawWebcamBackground(c: CanvasRenderingContext2D) {
  if (cameraMode.value !== 'canvas-bg') return
  const v = videoEl.value
  if (!v || v.readyState < 2) return
  const vw = v.videoWidth || 640
  const vh = v.videoHeight || 480
  // Cover-масштабування відео під канвас
  const scale = Math.max(W / vw, H / vh)
  const dw = vw * scale
  const dh = vh * scale
  c.save()
  c.globalAlpha = camOpacity.value
  c.drawImage(v, (W - dw) / 2, (H - dh) / 2, dw, dh)
  c.restore()
}

function draw() {
  const c = ctx
  if (!c) return

  // Фон (градієнт)
  const grad = c.createLinearGradient(0, 0, 0, H)
  grad.addColorStop(0, '#0b1026')
  grad.addColorStop(1, '#1a1f3a')
  c.fillStyle = grad
  c.fillRect(0, 0, W, H)

  // Веб-камера як напівпрозорий фон (перед ігровими об'єктами)
  drawWebcamBackground(c)

  // Верхня панель тіні
  c.fillStyle = 'rgba(255,255,255,0.02)'
  c.fillRect(0, 0, W, 6)

  // Цеглинки
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

  // Бонуси
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

  // Ракетка
  const paddleGrad = c.createLinearGradient(paddle.x, PADDLE_Y, paddle.x, PADDLE_Y + PADDLE_H)
  paddleGrad.addColorStop(0, diffConfig.value.color)
  paddleGrad.addColorStop(1, 'rgba(255,255,255,0.25)')
  c.shadowColor = diffConfig.value.color
  c.shadowBlur = 16
  c.fillStyle = paddleGrad
  c.beginPath()
  c.roundRect(paddle.x, PADDLE_Y, paddle.w, PADDLE_H, 7)
  c.fill()
  c.shadowBlur = 0

  // М'ячі
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

  // Підказка, коли м'яч на ракетці
  if (ballStuck && screen.value === 'playing') {
    c.fillStyle = 'rgba(255,255,255,0.5)'
    c.font = '16px system-ui, sans-serif'
    c.textAlign = 'center'
    c.fillText('Клікніть або натисніть Space, щоб запустити м\u2019яч', W / 2, H - 90)
  }
}

// ---------------------------------------------------------------------------
// Ігровий цикл — 60 FPS через requestAnimationFrame
// ---------------------------------------------------------------------------
function loop(time: number) {
  rafId = requestAnimationFrame(loop)
  const dt = Math.min(50, time - lastTime || 16)
  lastTime = time

  fps.value = Math.round(1000 / Math.max(dt, 1))

  if (screen.value === 'playing') {
    update(dt)
  }
  draw()
}

// ---------------------------------------------------------------------------
// Введення
// ---------------------------------------------------------------------------
function onKeyDown(e: KeyboardEvent) {
  if (e.code === 'ArrowLeft') keys.left = true
  if (e.code === 'ArrowRight') keys.right = true
  if (e.code === 'Space') {
    e.preventDefault()
    if (screen.value === 'playing') launch()
    else if (screen.value === 'menu' || screen.value === 'gameover' || screen.value === 'win') startGame()
    else if (screen.value === 'paused') togglePause()
  }
  if (e.code === 'KeyP' || e.code === 'Escape') {
    if (screen.value === 'playing' || screen.value === 'paused') togglePause()
  }
}

function onKeyUp(e: KeyboardEvent) {
  if (e.code === 'ArrowLeft') keys.left = false
  if (e.code === 'ArrowRight') keys.right = false
}

function onPointerMove(e: PointerEvent) {
  const el = canvas.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  mouseX = ((e.clientX - rect.left) / rect.width) * W
  mouseMoved = true
}

function onPointerLeave() {
  mouseMoved = false
}

function onPointerDown(e: PointerEvent) {
  onPointerMove(e)
  launch()
}

function onVisibility() {
  if (document.hidden) {
    stopMusic()
    if (screen.value === 'playing') screen.value = 'paused'
  }
}

// ---------------------------------------------------------------------------
// Монтування / розмонтування
// ---------------------------------------------------------------------------
onMounted(() => {
  const el = canvas.value
  if (el) {
    const dpr = window.devicePixelRatio || 1
    el.width = W * dpr
    el.height = H * dpr
    ctx = el.getContext('2d')
    if (ctx) ctx.scale(dpr, dpr)
  }
  resetPaddle()
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
  document.addEventListener('visibilitychange', onVisibility)
  // Стартовий кадр у меню
  buildBricks()
  bricksLeft.value = bricks.length
  lastTime = performance.now()
  rafId = requestAnimationFrame(loop)
  running = true
})

onUnmounted(() => {
  cancelAnimationFrame(rafId)
  running = false
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('keyup', onKeyUp)
  document.removeEventListener('visibilitychange', onVisibility)
  stopMusic()
  void audioCtx?.close()
  audioCtx = null
})

watch(difficulty, (d) => {
  paddle.w = DIFFICULTIES[d].paddleWidth
})

// Виклик ensureAudio реагує на user gesture (кнопки/клік по канвасу)
</script>

<template>
  <div class="game-wrapper">
    <!-- Прихований video-елемент: джерело кадрів для canvas-фону -->
    <video ref="videoEl" class="cam-video-src" muted playsinline autoplay />

    <!-- ============================================ Головне меню -->
    <Transition name="fade" mode="out-in">
      <div v-if="screen === 'menu'" key="menu" class="overlay">
        <div class="panel">
          <h1 class="title">
            <span class="title-icon">🎮</span>
            ARKANOID
          </h1>
          <p class="subtitle">Класичний Breakout на Vue 3 + Canvas + WebCam</p>

          <div class="diff-grid">
            <button
              v-for="(cfg, key) in DIFFICULTIES"
              :key="key"
              class="diff-card"
              :class="{ selected: difficulty === key }"
              :style="difficulty === key ? { borderColor: cfg.color, boxShadow: `0 0 20px ${cfg.color}44` } : {}"
              @click="difficulty = key as Difficulty"
            >
              <span class="diff-name" :style="{ color: cfg.color }">{{ cfg.label }}</span>
              <span class="diff-stats">
                Швидкість: {{ cfg.ballSpeed }} · Приріст/hвилю: +{{ Math.round(cfg.speedupPerLevel * 100) }}% ·
                Ракетка: {{ cfg.paddleWidth }}px · Життя: {{ cfg.lives }}
              </span>
            </button>
          </div>

          <button class="btn btn-primary" @click="startGame">
            ▶ Розпочати гру
          </button>

          <div class="hints">
            <p>🖱️ Мишка / ⬅️➡️ стрілки — керування</p>
            <p>␣ Space — запуск м'яча · P — пауза</p>
            <p>Розбийте всі 3 хвилі цеглин, збирайте бонуси ● та ×3</p>
          </div>
        </div>
      </div>

      <!-- ============================================ Пауза -->
      <div v-else-if="screen === 'paused'" key="paused" class="overlay">
        <div class="panel small">
          <h2 class="title-2">⏸ Пауза</h2>
          <button class="btn btn-primary" @click="togglePause">▶ Продовжити</button>
          <button class="btn btn-ghost" @click="backToMenu">🏠 Головне меню</button>
        </div>
      </div>

      <!-- ============================================ Game Over -->
      <div v-else-if="screen === 'gameover'" key="gameover" class="overlay">
        <div class="panel small">
          <h2 class="title-2 danger">💀 Гра закінчена</h2>
          <p class="final-score">Рахунок: <strong>{{ score }}</strong></p>
          <button class="btn btn-primary" @click="startGame">🔄 Спробувати ще</button>
          <button class="btn btn-ghost" @click="backToMenu">🏠 Головне меню</button>
        </div>
      </div>

      <!-- ============================================ Перемога -->
      <div v-else-if="screen === 'win'" key="win" class="overlay">
        <div class="panel small">
          <h2 class="title-2 success">🏆 Перемога!</h2>
          <p class="final-score">
            Ви пройшли всі 3 хвилі! Фінальний рахунок: <strong>{{ score }}</strong>
          </p>
          <button class="btn btn-primary" @click="startGame">🔄 Грати знову</button>
          <button class="btn btn-ghost" @click="backToMenu">🏠 Головне меню</button>
        </div>
      </div>
    </Transition>

    <!-- ============================================ Ігрове поле -->
    <div class="stage">
      <div class="hud">
        <div class="hud-item">
          <span class="hud-label">SCORE</span>
          <span class="hud-value accent">{{ score }}</span>
        </div>
        <div class="hud-item">
          <span class="hud-label">LIVES</span>
          <span class="hud-value">
            <template v-if="lives > 0">❤️</template>
            <template v-else>🖤</template>
            {{ lives }}
          </span>
        </div>
        <div class="hud-item">
          <span class="hud-label">Складність</span>
          <span class="hud-value" :style="{ color: diffConfig.color }">{{ diffConfig.label }}</span>
        </div>
        <div class="hud-item">
          <span class="hud-label">Швидкість</span>
          <span class="hud-value muted">{{ currentBallSpeed().toFixed(1) }}</span>
        </div>
        <div class="hud-item">
          <span class="hud-label">Хвиля</span>
          <span class="hud-value">{{ Math.min(wave + 1, 3) }} / 3</span>
        </div>
        <div class="hud-item">
          <span class="hud-label">FPS</span>
          <span class="hud-value muted">{{ fps }}</span>
        </div>
        <div class="hud-actions">
          <button
            class="icon-btn"
            :class="{ active: cameraMode !== 'off' }"
            :title="CAM_MODE_LABELS[cameraMode] + ' (клік — перемкнути режим)'"
            @click="cycleCameraMode"
          >
            {{ cameraLoading ? '⏳' : CAM_MODE_LABELS[cameraMode].split(' ')[0] }}
          </button>
          <button
            class="icon-btn"
            :title="sfxOn ? 'Вимкнути звуки ефектів' : 'Увімкнути звуки ефектів'"
            @click="sfxOn = !sfxOn"
          >
            {{ sfxOn ? '🔊' : '🔇' }}
          </button>
          <button
            class="icon-btn"
            :title="musicOn ? 'Вимкнути музику' : 'Увімкнути музику'"
            @click="musicOn = !musicOn"
          >
            <span :class="{ dimmed: !musicOn }">🎵</span>
          </button>
          <button
            v-if="screen === 'playing' || screen === 'paused'"
            class="icon-btn"
            title="Пауза / продовжити (P)"
            @click="togglePause"
          >
            {{ screen === 'paused' ? '▶️' : '⏸️' }}
          </button>
          <button v-if="screen === 'playing' || screen === 'paused'" class="icon-btn" title="Перезапуск" @click="startGame">
            🔄
          </button>
        </div>
      </div>

      <!-- Повідомлення про помилку камери -->
      <div v-if="cameraError" class="cam-error">
        ⚠️ {{ cameraError }}
      </div>

      <!-- Панель налаштувань камери -->
      <div v-if="cameraMode !== 'off'" class="cam-controls">
        <button class="cam-mode-btn" @click="setCameraMode(cameraMode === 'canvas-bg' ? 'float' : 'canvas-bg')">
          {{ cameraMode === 'canvas-bg' ? '🖼 Фон поля' : '🪟 Плаваюче вікно' }}
        </button>
        <button class="cam-mode-btn ghost" @click="setCameraMode('off')">✕ Вимкнути камеру</button>
        <label v-if="cameraMode === 'canvas-bg'" class="cam-opacity">
          Прозорість
          <input v-model.number="camOpacity" type="range" min="0.1" max="0.8" step="0.05" />
          <span>{{ Math.round(camOpacity * 100) }}%</span>
        </label>
      </div>

      <canvas
        ref="canvas"
        class="game-canvas"
        :width="W"
        :height="H"
        @pointermove="onPointerMove"
        @pointerdown="onPointerDown"
        @pointerleave="onPointerLeave"
      />

      <!-- ============================================ Плаваюче віконце камери -->
      <div
        v-if="cameraMode === 'float' && !camWin.minimized"
        class="cam-float"
        :class="{ dragging: camDragging }"
        :style="{ left: camWin.x + 'px', top: camWin.y + 'px' }"
      >
        <div class="cam-float-header" @pointerdown="onCamDragStart" @pointermove="onCamDragMove" @pointerup="onCamDragEnd" @pointercancel="onCamDragEnd">
          <span class="cam-float-title">📷 Камера</span>
          <button class="cam-float-btn" title="Згорнути" @click.stop="toggleCamMinimized">—</button>
          <button class="cam-float-btn" title="Вимкнути камеру" @click.stop="setCameraMode('off')">✕</button>
        </div>
        <video ref="camFloatVideo" class="cam-float-video" muted playsinline autoplay />
      </div>

      <!-- Згорнуте віконце -->
      <button
        v-else-if="cameraMode === 'float' && camWin.minimized"
        class="cam-float-min"
        :style="{ left: camWin.x + 'px', top: camWin.y + 'px' }"
        title="Розгорнути камеру"
        @click="toggleCamMinimized"
      >
        📷
      </button>
    </div>
  </div>
</template>

<style scoped>
.game-wrapper {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  padding: 18px;
  background: radial-gradient(circle at 50% 0%, #13173a 0%, #05060f 70%);
  color: #e2e8f0;
  font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  user-select: none;
}

/* Приховане джерело відео для канвас-фону */
.cam-video-src {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}

/* ------------------------------------------ Stage + Canvas */
.stage {
  position: relative;
  width: min(800px, 96vw);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.game-canvas {
  width: 100%;
  aspect-ratio: 4 / 3;
  border-radius: 14px;
  background: #0b1026;
  border: 1px solid rgba(125, 211, 252, 0.18);
  box-shadow:
    0 0 0 1px rgba(0, 0, 0, 0.5),
    0 8px 40px rgba(56, 189, 248, 0.09),
    0 2px 12px rgba(0, 0, 0, 0.5);
  cursor: none;
  touch-action: none;
}

/* ------------------------------------------ HUD */
.hud {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  padding: 10px 16px;
  background: rgba(17, 24, 39, 0.75);
  border: 1px solid rgba(125, 211, 252, 0.12);
  border-radius: 12px;
  backdrop-filter: blur(8px);
}

.hud-item {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.hud-label {
  font-size: 10px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #64748b;
}

.hud-value {
  font-size: 18px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.hud-value.accent { color: #7dd3fc; }
.hud-value.muted { color: #475569; font-size: 13px; }

.hud-actions {
  margin-left: auto;
  display: flex;
  gap: 6px;
}

.icon-btn {
  width: 34px;
  height: 34px;
  border: none;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.06);
  color: #e2e8f0;
  font-size: 15px;
  cursor: pointer;
  transition: background 0.15s, transform 0.1s;
}

.icon-btn:hover {
  background: rgba(255, 255, 255, 0.12);
  transform: translateY(-1px);
}

.icon-btn.active {
  background: rgba(56, 189, 248, 0.25);
  box-shadow: 0 0 10px rgba(56, 189, 248, 0.45);
}

.icon-btn .dimmed { opacity: 0.35; }

/* ------------------------------------------ Камера: керування */
.cam-error {
  padding: 8px 14px;
  border-radius: 10px;
  background: rgba(248, 113, 113, 0.12);
  border: 1px solid rgba(248, 113, 113, 0.35);
  color: #fca5a5;
  font-size: 13px;
}

.cam-controls {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  padding: 8px 12px;
  border-radius: 10px;
  background: rgba(17, 24, 39, 0.65);
  border: 1px solid rgba(125, 211, 252, 0.12);
}

.cam-mode-btn {
  padding: 7px 14px;
  border: none;
  border-radius: 8px;
  background: rgba(56, 189, 248, 0.18);
  color: #7dd3fc;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
}

.cam-mode-btn:hover { background: rgba(56, 189, 248, 0.3); }

.cam-mode-btn.ghost {
  background: rgba(255, 255, 255, 0.06);
  color: #94a3b8;
}

.cam-mode-btn.ghost:hover { background: rgba(248, 113, 113, 0.15); color: #fca5a5; }

.cam-opacity {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #94a3b8;
}

.cam-opacity input[type='range'] {
  width: 120px;
  accent-color: #38bdf8;
}

/* ------------------------------------------ Камера: плаваюче вікно */
.cam-float {
  position: absolute;
  z-index: 20;
  width: 256px;
  border-radius: 12px;
  overflow: hidden;
  background: rgba(10, 14, 30, 0.92);
  border: 1px solid rgba(125, 211, 252, 0.35);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.6), 0 0 18px rgba(56, 189, 248, 0.2);
}

.cam-float.dragging { opacity: 0.9; }

.cam-float-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  background: rgba(15, 20, 40, 0.95);
  cursor: grab;
  touch-action: none;
}

.cam-float-header:active { cursor: grabbing; }

.cam-float-title {
  flex: 1;
  font-size: 12px;
  color: #94a3b8;
}

.cam-float-btn {
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.08);
  color: #e2e8f0;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.15s;
}

.cam-float-btn:hover { background: rgba(255, 255, 255, 0.18); }

.cam-float-video {
  display: block;
  width: 100%;
  aspect-ratio: 4 / 3;
  object-fit: cover;
  background: #0b1026;
  transform: scaleX(-1); /* дзеркально, як у дзеркалі */
}

.cam-float-min {
  position: absolute;
  z-index: 20;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 1px solid rgba(125, 211, 252, 0.35);
  background: rgba(10, 14, 30, 0.9);
  font-size: 18px;
  cursor: pointer;
  transition: transform 0.12s;
}

.cam-float-min:hover { transform: scale(1.1); }

/* ------------------------------------------ Оверлеї */
.overlay {
  position: absolute;
  inset: 10px 0 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(5, 6, 15, 0.72);
  backdrop-filter: blur(6px);
  border-radius: 14px;
  z-index: 10;
}

.panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18px;
  padding: 34px 42px;
  background: rgba(15, 20, 40, 0.92);
  border: 1px solid rgba(125, 211, 252, 0.16);
  border-radius: 18px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
  max-width: 92%;
}

.panel.small { padding: 28px 36px; }

.title {
  font-size: 42px;
  font-weight: 900;
  letter-spacing: 0.18em;
  margin: 0;
  background: linear-gradient(135deg, #7dd3fc, #f472b6 60%, #fbbf24);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.title-icon { filter: drop-shadow(0 0 12px rgba(251, 191, 36, 0.5)); }

.title-2 {
  font-size: 32px;
  font-weight: 800;
  margin: 0;
}

.title-2.danger { color: #f87171; text-shadow: 0 0 24px rgba(248, 113, 113, 0.4); }
.title-2.success { color: #34d399; text-shadow: 0 0 24px rgba(52, 211, 153, 0.4); }

.subtitle {
  margin: 0;
  color: #94a3b8;
  font-size: 14px;
}

.final-score {
  margin: 0;
  font-size: 17px;
  color: #cbd5e1;
}

.final-score strong { color: #7dd3fc; font-size: 22px; }

/* ------------------------------------------ Вибір складності */
.diff-grid {
  display: flex;
  gap: 10px;
  width: 100%;
  max-width: 620px;
}

.diff-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 14px 12px;
  border: 2px solid rgba(148, 163, 184, 0.2);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
  cursor: pointer;
  transition: border-color 0.15s, transform 0.12s, box-shadow 0.15s;
  color: inherit;
  font: inherit;
}

.diff-card:hover { transform: translateY(-2px); }

.diff-card.selected {
  background: rgba(255, 255, 255, 0.07);
}

.diff-name {
  font-size: 16px;
  font-weight: 800;
}

.diff-stats {
  font-size: 11px;
  color: #94a3b8;
  line-height: 1.5;
}

/* ------------------------------------------ Кнопки */
.btn {
  padding: 12px 30px;
  font-size: 16px;
  font-weight: 700;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: transform 0.12s, box-shadow 0.15s, background 0.15s;
  font-family: inherit;
}

.btn-primary {
  background: linear-gradient(135deg, #0ea5e9, #6366f1);
  color: #fff;
  box-shadow: 0 6px 24px rgba(56, 189, 248, 0.35);
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 30px rgba(56, 189, 248, 0.5);
}

.btn-ghost {
  background: rgba(255, 255, 255, 0.06);
  color: #cbd5e1;
  border: 1px solid rgba(255, 255, 255, 0.12);
}

.btn-ghost:hover {
  background: rgba(255, 255, 255, 0.1);
  transform: translateY(-1px);
}

/* ------------------------------------------ Підказки */
.hints {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12.5px;
  color: #64748b;
  text-align: center;
}

.hints p { margin: 0; }

/* ------------------------------------------ Анімації */
.fade-enter-active,
.fade-leave-active { transition: opacity 0.25s ease, transform 0.25s ease; }
.fade-enter-from,
.fade-leave-to { opacity: 0; transform: scale(0.97); }

/* ------------------------------------------ Адаптивність */
@media (max-width: 640px) {
  .title { font-size: 30px; }
  .diff-grid { flex-direction: column; }
  .hud { gap: 10px; padding: 8px 12px; }
  .hud-value { font-size: 15px; }
  .cam-float { width: 180px; }
}
</style>
