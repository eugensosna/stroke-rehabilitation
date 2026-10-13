<script setup lang="ts">
import { ref, watch } from 'vue'
import { playStream } from '@/composables/useWebcamStream'

interface Props {
  stream: MediaStream | null
  /** Розміри області, в межах якої можна перетягувати віконце */
  boundsWidth: number
  boundsHeight: number
}

interface Emits {
  (e: 'close'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const videoRef = ref<HTMLVideoElement | null>(null)
// Стартова позиція — щоразу, коли вмикається режим плаваючого віконця
const win = ref({ x: props.boundsWidth - 260, y: 330, minimized: false })
const dragging = ref(false)
let dragStart = { x: 0, y: 0, winX: 0, winY: 0 }

// Пере-підключення потоку, коли video монтується через v-if
watch([videoRef, () => props.stream], ([video, stream]) => playStream(video, stream), { immediate: true })

function onDragStart(e: PointerEvent) {
  dragging.value = true
  dragStart = { x: e.clientX, y: e.clientY, winX: win.value.x, winY: win.value.y }
  ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
}

function onDragMove(e: PointerEvent) {
  if (!dragging.value) return
  const dx = e.clientX - dragStart.x
  const dy = e.clientY - dragStart.y
  win.value.x = Math.max(4, Math.min(props.boundsWidth - 210, dragStart.winX + dx))
  win.value.y = Math.max(44, Math.min(props.boundsHeight - 60, dragStart.winY + dy))
}

function onDragEnd() {
  dragging.value = false
}

function toggleMinimized() {
  win.value.minimized = !win.value.minimized
}
</script>

<template>
  <div
    v-if="!win.minimized"
    class="cam-float"
    :class="{ dragging }"
    :style="{ left: win.x + 'px', top: win.y + 'px' }"
  >
    <div
      class="cam-float-header"
      @pointerdown="onDragStart"
      @pointermove="onDragMove"
      @pointerup="onDragEnd"
      @pointercancel="onDragEnd"
    >
      <span class="cam-float-title">📷 Камера</span>
      <button class="cam-float-btn" title="Згорнути" @click.stop="toggleMinimized">—</button>
      <button class="cam-float-btn" title="Вимкнути камеру" @click.stop="emit('close')">✕</button>
    </div>
    <video ref="videoRef" class="cam-float-video" muted playsinline autoplay />
  </div>

  <!-- Згорнуте віконце -->
  <button
    v-else
    class="cam-float-min"
    :style="{ left: win.x + 'px', top: win.y + 'px' }"
    title="Розгорнути камеру"
    @click="toggleMinimized"
  >
    📷
  </button>
</template>

<style scoped>
.cam-float {
  position: absolute;
  z-index: 20;
  width: 256px;
  border-radius: 12px;
  overflow: hidden;
  background: rgba(10, 14, 30, 0.92);
  border: 1px solid rgba(125, 211, 252, 0.35);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.6), 0 0 18px rgba(56, 189, 248, 0.2);
}

.cam-float.dragging { opacity: 0.9; }

.cam-float-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  background: rgba(15, 20, 40, 0.95);
  cursor: grab;
  touch-action: none;
}

.cam-float-header:active { cursor: grabbing; }

.cam-float-title {
  flex: 1;
  font-size: 12px;
  color: #94a3b8;
}

.cam-float-btn {
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.08);
  color: #e2e8f0;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.15s;
}

.cam-float-btn:hover { background: rgba(255, 255, 255, 0.18); }

.cam-float-video {
  display: block;
  width: 100%;
  aspect-ratio: 4 / 3;
  object-fit: cover;
  background: #0b1026;
  transform: scaleX(-1); /* дзеркально, як у дзеркалі */
}

.cam-float-min {
  position: absolute;
  z-index: 20;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 1px solid rgba(125, 211, 252, 0.35);
  background: rgba(10, 14, 30, 0.9);
  font-size: 18px;
  cursor: pointer;
  transition: transform 0.12s;
}

.cam-float-min:hover { transform: scale(1.1); }

@media (max-width: 640px) {
  .cam-float { width: 180px; }
}
</style>
