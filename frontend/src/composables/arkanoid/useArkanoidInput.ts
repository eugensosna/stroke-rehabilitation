import { onMounted, onUnmounted, type Ref } from 'vue'
import { W } from './config'

export interface ArkanoidInputHandlers {
  /** Space */
  onPrimary: () => void
  /** P / Escape */
  onPause: () => void
  /** Клік / дотик по канвасу */
  onLaunch: () => void
}

// Клавіатура (стрілки, Space, P) і миша/дотик над канвасом
export function useArkanoidInput(canvasRef: Ref<HTMLCanvasElement | null>, handlers: ArkanoidInputHandlers) {
  const keys = { left: false, right: false }
  let mouseX = W / 2
  let mouseMoved = false

  function onKeyDown(e: KeyboardEvent) {
    if (e.code === 'ArrowLeft') keys.left = true
    if (e.code === 'ArrowRight') keys.right = true
    // клавіші перехоплюють керування у миші, поки її знову не зрушать
    if (keys.left || keys.right) mouseMoved = false
    if (e.code === 'Space') {
      e.preventDefault()
      handlers.onPrimary()
    }
    if (e.code === 'KeyP' || e.code === 'Escape') handlers.onPause()
  }

  function onKeyUp(e: KeyboardEvent) {
    if (e.code === 'ArrowLeft') keys.left = false
    if (e.code === 'ArrowRight') keys.right = false
  }

  function onPointerMove(e: PointerEvent) {
    const el = canvasRef.value
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
    handlers.onLaunch()
  }

  /** -1 — вліво, 1 — вправо, 0 — нічого */
  const keyDirection = () => (keys.right ? 1 : 0) - (keys.left ? 1 : 0)

  /** Центр ракетки за мишею або null, якщо миша не керує */
  const pointerX = () => (mouseMoved ? mouseX : null)

  onMounted(() => {
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
  })

  onUnmounted(() => {
    window.removeEventListener('keydown', onKeyDown)
    window.removeEventListener('keyup', onKeyUp)
  })

  return { keyDirection, pointerX, onPointerMove, onPointerLeave, onPointerDown }
}
