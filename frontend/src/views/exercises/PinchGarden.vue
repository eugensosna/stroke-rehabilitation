<script setup lang="ts">
// «Город» — щипковий захват. Гра отримує лише u, стан автомата і положення кисті з useExercise.
import { ref } from 'vue'
import type { ExerciseApi } from '@/composables/useExercise'
import { useGameScene } from '@/composables/useGameScene'
import { GardenScene } from '@/games/garden'

const props = defineProps<{ exercise: ExerciseApi }>()
const canvas = ref<HTMLCanvasElement | null>(null)
const scene = new GardenScene()
const { on } = useGameScene(canvas, props.exercise, scene)

on('goalReached', () => scene.onGoalReached())
on('success', () => scene.onSuccess())
on('fail', () => scene.onFail())
on('repetitionEnd', () => scene.onRepetitionEnd())
on('paused', () => scene.onPaused())
</script>

<template>
  <canvas ref="canvas" class="game-canvas" aria-label="Гра «Город»: щипковий захват" />
</template>

<style scoped>
.game-canvas {
  display: block;
  width: 100%;
  height: 100%;
}
</style>
