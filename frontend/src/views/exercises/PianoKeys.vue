<script setup lang="ts">
// «Піаніно» — ізольовані рухи пальців. Правильні натискання відтворюють мелодію.
import { ref, watch } from 'vue'
import type { ExerciseApi } from '@/composables/useExercise'
import { useGameScene } from '@/composables/useGameScene'
import { NOTE_FREQ, PianoScene, type PianoFinger } from '@/games/piano'

const props = defineProps<{
  exercise: ExerciseApi
  /** Пальці з достатнім діапазоном калібрування */
  fingers: PianoFinger[]
  playNote: (freq: number) => void
}>()
const canvas = ref<HTMLCanvasElement | null>(null)
const scene = new PianoScene(props.fingers)
const { on } = useGameScene(canvas, props.exercise, scene)

props.exercise.setTarget(scene.target)

on('success', () => props.playNote(NOTE_FREQ[scene.onSuccess()]))
on('repetitionEnd', () => props.exercise.setTarget(scene.target))

watch(
  () => props.exercise.feedback.value.movedFingers,
  (fingers) => scene.setMoved(fingers),
)
</script>

<template>
  <canvas ref="canvas" class="game-canvas" aria-label="Гра «Піаніно»: ізольовані рухи пальців" />
</template>

<style scoped>
.game-canvas {
  display: block;
  width: 100%;
  height: 100%;
}
</style>
