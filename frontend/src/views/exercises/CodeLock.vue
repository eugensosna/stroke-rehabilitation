<script setup lang="ts">
// «Кодовий замок» — вказування прямим пальцем і натискання наближенням кисті до камери.
import { ref, watch } from 'vue'
import type { ExerciseApi } from '@/composables/useExercise'
import { useGameScene } from '@/composables/useGameScene'
import { KeypadScene } from '@/games/keypad'

const props = defineProps<{ exercise: ExerciseApi }>()
const canvas = ref<HTMLCanvasElement | null>(null)
const scene = new KeypadScene()
const { on } = useGameScene(canvas, props.exercise, scene)

// рушій питає гру, яка клавіша під пальцем і чи правильна вона
props.exercise.setPointerJudge(scene)

watch(
  () => props.exercise.feedback.value.pointer,
  (p) => scene.setPointer(p ? { finger: p.finger, x: p.x, y: p.y, locked: p.locked } : null),
)
watch(
  () => props.exercise.level.value,
  (L) => scene.setLevel(L),
  { immediate: true },
)

on('success', () => scene.onSuccess(props.exercise.feedback.value.pointer?.locked ?? null))
on('fail', () => {
  const p = props.exercise.feedback.value.pointer
  scene.onFail(p?.wrong ?? p?.locked ?? null)
})
</script>

<template>
  <canvas ref="canvas" class="game-canvas" aria-label="Гра «Кодовий замок»: вказування прямим пальцем" />
</template>

<style scoped>
.game-canvas {
  display: block;
  width: 100%;
  height: 100%;
}
</style>
