<script setup lang="ts">
// «Арканоїд» — рух кисті ліворуч і праворуч; ракетку веде центр долоні, кисть видно на полі.
import { ref, watch } from 'vue'
import type { ExerciseApi } from '@/composables/useExercise'
import { useGameScene } from '@/composables/useGameScene'
import { ArkanoidScene } from '@/games/arkanoid'

const props = defineProps<{ exercise: ExerciseApi }>()
const canvas = ref<HTMLCanvasElement | null>(null)
// відбитий м'яч — успішне повторення, пропущений — невдале
const scene = new ArkanoidScene({
  onHit: () => props.exercise.reportOutcome(true),
  onMiss: () => props.exercise.reportOutcome(false),
})
useGameScene(canvas, props.exercise, scene)

watch(
  () => props.exercise.feedback.value.hand,
  (points) => scene.setHand(points ?? null),
)
watch(
  () => props.exercise.level.value,
  (L) => scene.setLevel(L),
  { immediate: true },
)
watch(
  () => props.exercise.running.value,
  (r) => scene.setActive(r),
  { immediate: true },
)
</script>

<template>
  <canvas ref="canvas" class="game-canvas" aria-label="Гра «Арканоїд»: рух кисті ліворуч і праворуч" />
</template>

<style scoped>
.game-canvas {
  display: block;
  width: 100%;
  height: 100%;
}
</style>
