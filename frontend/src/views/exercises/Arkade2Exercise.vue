<script setup lang="ts">
/**
 * «Арканоїд з бонусами» (гра arkade2) як вправа з єдиним керуванням: кадри — спільне джерело
 * оболонки вправи, ракетку веде центр долоні (u рушія вправи), кисть показано на полі.
 * Відбитий м'яч — успішне повторення, втрачене життя — невдале. Гра після програшу чи перемоги
 * починається знову, доки триває серія.
 */
import { onUnmounted, ref, watch } from 'vue'
import type { ExerciseApi } from '@/composables/useExercise'
import { H, PADDLE_Y, W } from '@/composables/arkanoid/config'
import { useArkanoidEngine } from '@/composables/arkanoid/useArkanoidEngine'
import { drawHandOverlay } from '@/games/handOverlay'
import type { Difficulty } from '@/types/arkanoid'

const props = defineProps<{ exercise: ExerciseApi; sound: boolean }>()
const canvas = ref<HTMLCanvasElement | null>(null)

/** Центр ракетки за положенням долоні (null — кисті немає, ракетка стоїть) */
function paddleCenter(): number | null {
  if (!props.exercise.feedback.value.handPos) return null
  const pw = game.diffConfig.value.paddleWidth
  return pw / 2 + Math.min(1, Math.max(0, props.exercise.u.value)) * (W - pw)
}

const game = useArkanoidEngine(canvas, {
  keyDirection: () => 0,
  paddleTarget: paddleCenter,
  layers: {
    afterPaddle: (c) => {
      const x = paddleCenter()
      if (x !== null) drawHandOverlay(c, props.exercise.feedback.value.hand, x, PADDLE_Y - 120, 75)
    },
  },
  onPaddleHit: () => props.exercise.reportOutcome(true),
  onLifeLost: () => props.exercise.reportOutcome(false),
  autoLaunchMs: 1200,
})
game.musicOn.value = false
watch(
  () => props.sound,
  (on) => (game.sfxOn.value = on),
  { immediate: true },
)

/** Складність гри за рівнем вправи */
const difficultyFor = (L: number): Difficulty => (L <= 3 ? 'easy' : L <= 7 ? 'normal' : 'hard')
watch(
  () => props.exercise.level.value,
  (L) => (game.difficulty.value = difficultyFor(L)),
  { immediate: true },
)

// серія: старт / завершення / пауза, коли кисть втрачено
watch(
  () => [props.exercise.running.value, props.exercise.state.value] as const,
  ([running, state]) => {
    const s = game.screen.value
    if (running && (s === 'menu' || s === 'gameover' || s === 'win')) game.startGame()
    else if (running && state !== 'Paused' && s === 'paused') game.togglePause()
    else if ((!running || state === 'Paused') && s === 'playing') game.togglePause()
  },
  { immediate: true },
)

// програш чи перемога посеред серії — нова гра після короткої паузи
let restartTimer: ReturnType<typeof setTimeout> | null = null
watch(game.screen, (s) => {
  if ((s === 'gameover' || s === 'win') && props.exercise.running.value) {
    restartTimer = setTimeout(() => {
      if (props.exercise.running.value) game.startGame()
    }, 1500)
  }
})
onUnmounted(() => {
  if (restartTimer) clearTimeout(restartTimer)
})

const { score, lives, wave } = game
</script>

<template>
  <div class="arkade2">
    <canvas ref="canvas" class="arkade2-canvas" :width="W" :height="H" aria-label="Гра «Арканоїд з бонусами»" />
    <div class="arkade2-hud" aria-live="polite">
      <span>Рахунок: <b>{{ score }}</b></span>
      <span>Життя: <b>{{ lives }}</b></span>
      <span>Хвиля: <b>{{ wave + 1 }}</b></span>
    </div>
    <p v-if="game.screen.value === 'gameover'" class="arkade2-msg">Життя скінчилися — нова гра за мить</p>
    <p v-else-if="game.screen.value === 'win'" class="arkade2-msg">Перемога! Нова гра за мить</p>
  </div>
</template>

<style scoped>
.arkade2 {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  background: radial-gradient(circle at 50% 0%, #13173a 0%, #05060f 70%);
}

.arkade2-canvas {
  height: 100%;
  max-width: 100%;
  aspect-ratio: 4 / 3;
  background: #0b1026;
}

.arkade2-hud {
  position: absolute;
  top: 8px;
  left: 12px;
  display: flex;
  gap: 18px;
  font-size: 18px;
  color: #e2e8f0;
}

.arkade2-msg {
  position: absolute;
  bottom: 40%;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.92);
  padding: 8px 18px;
  font-size: 24px;
  font-weight: 600;
  color: #0f172a;
}
</style>
