import { onUnmounted, ref, type Ref } from 'vue'
import { GameArcade } from '@/composables/useGame'
import type { Point2D } from '@/types/game'

const KEY_STEP = 0.05 // move by 5% of canvas width per key press

// Екземпляр GameArcade, ігровий цикл і керування з клавіатури
export function useArcadeGame(canvasRef: Ref<HTMLCanvasElement | null>) {
  const isGameRunning = ref(false)
  let game: GameArcade | null = null
  let frameId: number | null = null

  const loop = (ctx: CanvasRenderingContext2D) => {
    if (!game) return
    game.updatePhysics()
    game.draw(ctx)
    frameId = requestAnimationFrame(() => loop(ctx))
  }

  // Keyboard controls: move paddle left/right with arrow keys
  const onKeyDown = (e: KeyboardEvent) => {
    if (!game || !canvasRef.value) return

    const canvasWidth = canvasRef.value.width
    const paddleCenter = game.paddle.x + game.paddle.width / 2
    let percent = paddleCenter / canvasWidth

    if (e.key === 'ArrowLeft') {
      percent = Math.max(0, percent - KEY_STEP)
    } else if (e.key === 'ArrowRight') {
      percent = Math.min(1, percent + KEY_STEP)
    } else {
      return
    }

    game.movePaddle({ x: percent, y: 0, timestamp: Date.now() })
  }

  const init = () => {
    const canvas = canvasRef.value
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) {
      console.log('Game or context not initialized yet.')
      return
    }
    game = new GameArcade(canvas)
    window.addEventListener('keydown', onKeyDown)
    loop(ctx)
  }

  const movePaddle = (point: Point2D) => game?.movePaddle(point)

  const start = (): boolean => {
    if (!game) {
      console.error('Game instance is not initialized yet.')
      return false
    }
    isGameRunning.value = true
    game.startGame()
    return true
  }

  const stop = (): boolean => {
    if (!game) {
      console.error('Game instance is not initialized yet.')
      return false
    }
    isGameRunning.value = false
    game.stopGame()
    return true
  }

  onUnmounted(() => {
    if (frameId !== null) cancelAnimationFrame(frameId)
    window.removeEventListener('keydown', onKeyDown)
    game = null
  })

  return { isGameRunning, init, start, stop, movePaddle }
}
