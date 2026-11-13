import { getCurrentInstance, onUnmounted, type Ref } from 'vue'
import { useCanvasLoop } from '@/composables/useCanvasLoop'
import type { ExerciseApi, ExerciseEvent, ExerciseEventType } from '@/composables/useExercise'
import { Smoothed, type GameScene, type SceneInput } from '@/games/common'

/**
 * Зв'язок сцени гри з вправою: цикл відмальовування з інтерпольованим u
 * (частота відмальовування не залежить від частоти кадрів камери) і підписки на події.
 */
export function useGameScene(canvasRef: Ref<HTMLCanvasElement | null>, exercise: ExerciseApi, scene: GameScene) {
  const u = new Smoothed(0, 0.07)
  const offs: (() => void)[] = []

  useCanvasLoop(canvasRef, (ctx, w, h, dt) => {
    const input: SceneInput = {
      u: u.step(exercise.u.value, dt),
      state: exercise.state.value,
      thetaG: exercise.thetaG.value,
      thetaR: exercise.thetaR.value,
      handPos: exercise.feedback.value.handPos,
    }
    scene.update(dt, input)
    ctx.clearRect(0, 0, w, h)
    scene.draw(ctx, w, h, input)
  })

  /** Підписка на подію вправи з автоматичною відпискою при виході зі сторінки */
  function on(type: ExerciseEventType, cb: (e: ExerciseEvent) => void) {
    offs.push(exercise.on(type, cb))
  }

  if (getCurrentInstance()) onUnmounted(() => offs.forEach((off) => off()))

  return { on }
}
