<script setup lang="ts">
// «Повітряна куля» — розкриття і стискання кисті. Темп перешкод — бажана частота повторень.
import { ref } from 'vue'
import type { ExerciseApi } from '@/composables/useExercise'
import { useGameScene } from '@/composables/useGameScene'
import { BalloonScene } from '@/games/balloon'

const props = defineProps<{ exercise: ExerciseApi; frequencyHz: number }>()
const canvas = ref<HTMLCanvasElement | null>(null)
const scene = new BalloonScene(props.frequencyHz)
useGameScene(canvas, props.exercise, scene)
</script>

<template>
  <canvas ref="canvas" class="game-canvas" aria-label="Гра «Повітряна куля»: розкриття і стискання кисті" />
</template>

<style scoped>
.game-canvas {
  display: block;
  width: 100%;
  height: 100%;
}
</style>
