<script setup lang="ts">
import { ref } from 'vue'
import { useDraggable } from '@/composables/useDraggable'
import type { Point2D } from '@/types/game'

interface Props {
  visible: boolean
  title?: string
  initialPosition?: { x: number; y: number }
}

const props = withDefaults(defineProps<Props>(), {
  title: 'Camera Stream',
  initialPosition: () => ({ x: 300, y: 100 }),
})

const canvasRef = ref<HTMLCanvasElement | null>(null)
const { position, startDrag } = useDraggable(props.initialPosition)

// Дзеркальний кадр відео + маркер зап'ястка
const drawFrame = (video: HTMLVideoElement, wrist: Point2D | null): void => {
  const canvas = canvasRef.value
  const ctx = canvas?.getContext('2d')
  if (!canvas || !ctx) return

  const { width, height } = canvas
  ctx.clearRect(0, 0, width, height)

  ctx.save()
  ctx.translate(width, 0)
  ctx.scale(-1, 1)
  ctx.drawImage(video, 0, 0, width, height)
  ctx.restore()

  if (wrist) {
    ctx.beginPath()
    ctx.arc(wrist.x * width, wrist.y * height, 10, 0, 2 * Math.PI)
    ctx.fillStyle = 'rgba(255, 0, 0, 0.7)'
    ctx.fill()
  }
}

defineExpose({ drawFrame })
</script>

<template>
  <div class="floating-window" :style="{ top: position.y + 'px', left: position.x + 'px' }">
    <!-- Шапка вікна, за яку можна перетягувати -->
    <div class="window-header" @mousedown="startDrag">
      <div v-if="visible">
        <canvas ref="canvasRef" class="webcam-canvas"></canvas>
      </div>
      <span class="window-title">{{ title }}</span>
      <span class="drag-handle">⠿</span>
    </div>
  </div>
</template>

<style scoped>
.floating-window {
  position: fixed;
  z-index: 1000;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  min-width: 100px;
  min-height: 100px;
  transition: transform 0.2s ease-in-out;
}

.webcam-canvas {
  background-color: #000;
}
</style>
