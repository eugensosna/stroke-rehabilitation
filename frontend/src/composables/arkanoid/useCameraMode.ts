import { ref, type Ref } from 'vue'
import type { CameraMode } from '@/types/arkanoid'
import type { useWebcamStream } from '@/composables/useWebcamStream'
import { H, W } from './config'

const MODE_ORDER: CameraMode[] = ['off', 'canvas-bg', 'float']

// Режим показу камери: вимкнено / напівпрозорий фон поля / плаваюче вікно
export function useCameraMode(
  videoRef: Ref<HTMLVideoElement | null>,
  webcam: ReturnType<typeof useWebcamStream>,
  /** true — потік ще потрібен іншим (керування рукою), не зупиняти його */
  keepStream: () => boolean,
) {
  const mode = ref<CameraMode>('off')
  const opacity = ref(0.3) // прозорість фону канваса

  async function setMode(next: CameraMode) {
    if (next !== 'off' && !webcam.stream.value) {
      mode.value = next
      if (!(await webcam.enable())) {
        mode.value = 'off'
        return
      }
    }
    mode.value = next
    if (next === 'off' && !keepStream()) webcam.stop()
  }

  async function cycle() {
    await setMode(MODE_ORDER[(MODE_ORDER.indexOf(mode.value) + 1) % MODE_ORDER.length])
  }

  /** Шар фону для канваса: cover-масштабування відео */
  function drawBackground(c: CanvasRenderingContext2D) {
    if (mode.value !== 'canvas-bg') return
    const v = videoRef.value
    if (!v || v.readyState < 2) return
    const vw = v.videoWidth || 640
    const vh = v.videoHeight || 480
    const scale = Math.max(W / vw, H / vh)
    const dw = vw * scale
    const dh = vh * scale
    c.save()
    c.globalAlpha = opacity.value
    // дзеркально, як плаваюче вікно і selfieMode у MediaPipe — маркер руки збігається з відео
    c.translate(W, 0)
    c.scale(-1, 1)
    c.drawImage(v, (W - dw) / 2, (H - dh) / 2, dw, dh)
    c.restore()
  }

  return { mode, opacity, setMode, cycle, drawBackground }
}
