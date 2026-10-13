<script setup lang="ts">
import { CAM_MODE_LABELS, WAVES } from '@/composables/arkanoid/config'
import type { CameraMode, DifficultyConfig, GameScreen } from '@/types/arkanoid'

interface Props {
  score: number
  lives: number
  difficulty: DifficultyConfig
  ballSpeed: number
  wave: number
  fps: number
  screen: GameScreen
  cameraMode: CameraMode
  cameraLoading: boolean
  handControl: boolean
}

interface Emits {
  (e: 'cycle-camera'): void
  (e: 'toggle-hand'): void
  (e: 'toggle-pause'): void
  (e: 'restart'): void
}

defineProps<Props>()
const emit = defineEmits<Emits>()
const sfxOn = defineModel<boolean>('sfxOn', { required: true })
const musicOn = defineModel<boolean>('musicOn', { required: true })
</script>

<template>
  <div class="hud">
    <div class="hud-item">
      <span class="hud-label">SCORE</span>
      <span class="hud-value accent">{{ score }}</span>
    </div>
    <div class="hud-item">
      <span class="hud-label">LIVES</span>
      <span class="hud-value">
        <template v-if="lives > 0">❤️</template>
        <template v-else>🖤</template>
        {{ lives }}
      </span>
    </div>
    <div class="hud-item">
      <span class="hud-label">Складність</span>
      <span class="hud-value" :style="{ color: difficulty.color }">{{ difficulty.label }}</span>
    </div>
    <div class="hud-item">
      <span class="hud-label">Швидкість</span>
      <span class="hud-value muted">{{ ballSpeed.toFixed(1) }}</span>
    </div>
    <div class="hud-item">
      <span class="hud-label">Хвиля</span>
      <span class="hud-value">{{ Math.min(wave + 1, WAVES) }} / {{ WAVES }}</span>
    </div>
    <div class="hud-item">
      <span class="hud-label">FPS</span>
      <span class="hud-value muted">{{ fps }}</span>
    </div>
    <div class="hud-actions">
      <button
        class="icon-btn"
        :class="{ active: cameraMode !== 'off' }"
        :title="CAM_MODE_LABELS[cameraMode] + ' (клік — перемкнути режим)'"
        @click="emit('cycle-camera')"
      >
        {{ cameraLoading ? '⏳' : CAM_MODE_LABELS[cameraMode].split(' ')[0] }}
      </button>
      <button
        class="icon-btn"
        :class="{ active: handControl }"
        :title="handControl ? 'Вимкнути керування зап\'ястком' : 'Керувати ракеткою зап\'ястком (камера)'"
        @click="emit('toggle-hand')"
      >
        ✋
      </button>
      <button
        class="icon-btn"
        :title="sfxOn ? 'Вимкнути звуки ефектів' : 'Увімкнути звуки ефектів'"
        @click="sfxOn = !sfxOn"
      >
        {{ sfxOn ? '🔊' : '🔇' }}
      </button>
      <button
        class="icon-btn"
        :title="musicOn ? 'Вимкнути музику' : 'Увімкнути музику'"
        @click="musicOn = !musicOn"
      >
        <span :class="{ dimmed: !musicOn }">🎵</span>
      </button>
      <template v-if="screen === 'playing' || screen === 'paused'">
        <button class="icon-btn" title="Пауза / продовжити (P)" @click="emit('toggle-pause')">
          {{ screen === 'paused' ? '▶️' : '⏸️' }}
        </button>
        <button class="icon-btn" title="Перезапуск" @click="emit('restart')">🔄</button>
      </template>
    </div>
  </div>
</template>

<style scoped>
.hud {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  padding: 10px 16px;
  background: rgba(17, 24, 39, 0.75);
  border: 1px solid rgba(125, 211, 252, 0.12);
  border-radius: 12px;
  backdrop-filter: blur(8px);
}

.hud-item {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.hud-label {
  font-size: 10px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #64748b;
}

.hud-value {
  font-size: 18px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.hud-value.accent { color: #7dd3fc; }
.hud-value.muted { color: #475569; font-size: 13px; }

.hud-actions {
  margin-left: auto;
  display: flex;
  gap: 6px;
}

.icon-btn {
  width: 34px;
  height: 34px;
  border: none;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.06);
  color: #e2e8f0;
  font-size: 15px;
  cursor: pointer;
  transition: background 0.15s, transform 0.1s;
}

.icon-btn:hover {
  background: rgba(255, 255, 255, 0.12);
  transform: translateY(-1px);
}

.icon-btn.active {
  background: rgba(56, 189, 248, 0.25);
  box-shadow: 0 0 10px rgba(56, 189, 248, 0.45);
}

.icon-btn .dimmed { opacity: 0.35; }

@media (max-width: 640px) {
  .hud { gap: 10px; padding: 8px 12px; }
  .hud-value { font-size: 15px; }
}
</style>
