<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { coverRect, drawHandSkeleton } from '@/utils/drawHandSkeleton'
import type { HandFrame } from '@/types/landmarks'

// Мініатюра вебкамери: дзеркальне відео (CSS) і скелет кисті поверх нього.
// Відео є джерелом кадрів для моделі — кадр моделі не дзеркальний.
const props = withDefaults(
  defineProps<{
    frame: HandFrame | null
    /** Точки, які треба виділити на скелеті */
    highlight?: number[]
    label?: string
  }>(),
  { highlight: () => [], label: 'Вебкамера' },
)

const video = ref<HTMLVideoElement | null>(null)
const overlay = ref<HTMLCanvasElement | null>(null)
let observer: ResizeObserver | null = null

function draw() {
  const canvas = overlay.value
  const ctx = canvas?.getContext('2d')
  if (!canvas || !ctx) return
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  const v = video.value
  const rect = coverRect(canvas.width, canvas.height, v?.videoWidth || 640, v?.videoHeight || 480)
  drawHandSkeleton(ctx, props.frame, {
    mirrored: true,
    rect,
    highlight: props.highlight,
    lineWidth: Math.max(2, canvas.width / 120),
    radius: Math.max(3, canvas.width / 110),
  })
}

function resize() {
  const canvas = overlay.value
  if (!canvas) return
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  canvas.width = Math.round(canvas.clientWidth * dpr)
  canvas.height = Math.round(canvas.clientHeight * dpr)
  draw()
}

watch(() => props.frame, draw)

onMounted(() => {
  observer = new ResizeObserver(resize)
  if (overlay.value) observer.observe(overlay.value)
  resize()
})
onUnmounted(() => observer?.disconnect())

defineExpose({ video })
</script>

<template>
  <figure class="cam-thumb">
    <video ref="video" class="cam-video" autoplay playsinline muted :aria-label="label" />
    <canvas ref="overlay" class="cam-overlay" aria-hidden="true" />
    <figcaption class="sr-only">{{ label }}</figcaption>
  </figure>
</template>

<style scoped>
.cam-thumb {
  position: relative;
  width: 100%;
  aspect-ratio: 4 / 3;
  margin: 0;
  overflow: hidden;
  border-radius: 14px;
  background: #0f172a;
}
.cam-video,
.cam-overlay {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}
.cam-video {
  object-fit: cover;
  /* дзеркальне зображення лише на екрані; модель отримує кадр без відображення */
  transform: scaleX(-1);
}
</style>
