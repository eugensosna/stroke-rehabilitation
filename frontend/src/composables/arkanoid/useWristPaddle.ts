import { onMounted, onUnmounted, ref, watch, type Ref } from 'vue'
import { useGameSession } from '@/composables/useGameSession'
import { useHandTracking } from '@/composables/useHandTracking'
import { useWristMotion } from '@/composables/useWristMotion'
import type { useWebcamStream } from '@/composables/useWebcamStream'
import { H, W } from './config'

const HAND_LOST_MS = 500 // руки немає в кадрі довше — керують миша/клавіші

export interface WristPaddleOptions {
  gameName: string
  /** Рухи записуються лише під час гри */
  isPlaying: () => boolean
  /** true — потік камери ще потрібен (показ камери), не зупиняти при вимкненні */
  keepStream: () => boolean
  /** Увімкнути керування рукою одразу після завантаження сторінки */
  enabledDetection?: boolean
}

// Керування ракеткою зап'ястком (MediaPipe Hands, як у GameArcade1) + статистика рухів
export function useWristPaddle(
  videoRef: Ref<HTMLVideoElement | null>,
  webcam: ReturnType<typeof useWebcamStream>,
  options: WristPaddleOptions,
) {
  const enabled = ref(false)
  let handX = W / 2
  let handY = 0
  let handSeenAt = 0

  // Ракетка рухається щокадру в рушії; трекер лише збирає статистику рухів
  const { tracker, printStatistics } = useWristMotion(() => {})
  const session = useGameSession(options.gameName, () => tracker.getHistory())

  const hands = useHandTracking(videoRef, {
    // selfieMode: x уже дзеркальний, 0..1 зліва направо
    onWrist: (point) => {
      handX = point.x * W
      handY = point.y * H
      handSeenAt = performance.now()
      if (options.isPlaying()) tracker.update(point.x, point.y)
    },
    maxNumHands: 1,
  })

  const isActive = () => enabled.value && performance.now() - handSeenAt < HAND_LOST_MS

  /** Центр ракетки за зап'ястком або null, якщо руки немає */
  const targetX = () => (isActive() ? handX : null)

  function disable() {
    enabled.value = false
    hands.stop()
  }

  async function enable() {
    if (enabled.value) return
    if (!(await webcam.enable())) return
    enabled.value = true
    hands.attach()
  }

  async function toggle() {
    if (enabled.value) {
      disable()
      if (!options.keepStream()) webcam.stop()
      return
    }
    await enable()
  }

  onMounted(() => {
    if (options.enabledDetection) void enable()
  })

  // камеру вимкнули — керування рукою теж
  watch(webcam.stream, (stream) => {
    if (!stream && enabled.value) disable()
  })

  onUnmounted(() => hands.stop())

  /** Маркер зап'ястка — зворотний зв'язок, куди «дивиться» рука */
  function drawMarker(c: CanvasRenderingContext2D) {
    if (!isActive()) return
    c.save()
    c.strokeStyle = 'rgba(248, 113, 113, 0.8)'
    c.lineWidth = 3
    c.beginPath()
    c.arc(handX, handY, 12, 0, Math.PI * 2)
    c.stroke()
    c.restore()
  }

  /** Попередню сесію зберігаємо; нову починаємо, лише якщо керує рука */
  function beginSession() {
    endSession()
    if (!enabled.value) return
    // рахуємо лише рухи, зроблені під час гри
    tracker.clearHistory()
    session.begin()
  }

  function endSession() {
    printStatistics()
    session.save()
  }

  return {
    enabled,
    saveStatus: session.saveStatus,
    toggle,
    targetX,
    drawMarker,
    beginSession,
    endSession,
  }
}
