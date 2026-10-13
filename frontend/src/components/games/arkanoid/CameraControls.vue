<script setup lang="ts">
import type { CameraMode } from '@/types/arkanoid'

interface Props {
  mode: CameraMode
}

interface Emits {
  (e: 'set-mode', mode: CameraMode): void
}

defineProps<Props>()
const emit = defineEmits<Emits>()
const opacity = defineModel<number>('opacity', { required: true })
</script>

<template>
  <div class="cam-controls">
    <button class="cam-mode-btn" @click="emit('set-mode', mode === 'canvas-bg' ? 'float' : 'canvas-bg')">
      {{ mode === 'canvas-bg' ? '🖼 Фон поля' : '🪟 Плаваюче вікно' }}
    </button>
    <button class="cam-mode-btn ghost" @click="emit('set-mode', 'off')">✕ Вимкнути камеру</button>
    <label v-if="mode === 'canvas-bg'" class="cam-opacity">
      Прозорість
      <input v-model.number="opacity" type="range" min="0.1" max="0.8" step="0.05" />
      <span>{{ Math.round(opacity * 100) }}%</span>
    </label>
  </div>
</template>

<style scoped>
.cam-controls {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  padding: 8px 12px;
  border-radius: 10px;
  background: rgba(17, 24, 39, 0.65);
  border: 1px solid rgba(125, 211, 252, 0.12);
}

.cam-mode-btn {
  padding: 7px 14px;
  border: none;
  border-radius: 8px;
  background: rgba(56, 189, 248, 0.18);
  color: #7dd3fc;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
}

.cam-mode-btn:hover { background: rgba(56, 189, 248, 0.3); }

.cam-mode-btn.ghost {
  background: rgba(255, 255, 255, 0.06);
  color: #94a3b8;
}

.cam-mode-btn.ghost:hover { background: rgba(248, 113, 113, 0.15); color: #fca5a5; }

.cam-opacity {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #94a3b8;
}

.cam-opacity input[type='range'] {
  width: 120px;
  accent-color: #38bdf8;
}
</style>
