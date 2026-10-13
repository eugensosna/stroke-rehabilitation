<script setup lang="ts">
import { DIFFICULTIES } from '@/composables/arkanoid/config'
import type { Difficulty } from '@/types/arkanoid'

interface Emits {
  (e: 'start'): void
}

const difficulty = defineModel<Difficulty>('difficulty', { required: true })
const emit = defineEmits<Emits>()
</script>

<template>
  <div class="overlay">
    <div class="panel">
      <h1 class="title">
        <span class="title-icon">🎮</span>
        ARKANOID
      </h1>
      <p class="subtitle">Класичний Breakout на Vue 3 + Canvas + WebCam</p>

      <div class="diff-grid">
        <button
          v-for="(cfg, key) in DIFFICULTIES"
          :key="key"
          class="diff-card"
          :class="{ selected: difficulty === key }"
          :style="difficulty === key ? { borderColor: cfg.color, boxShadow: `0 0 20px ${cfg.color}44` } : {}"
          @click="difficulty = key as Difficulty"
        >
          <span class="diff-name" :style="{ color: cfg.color }">{{ cfg.label }}</span>
          <span class="diff-stats">
            Швидкість: {{ cfg.ballSpeed }} · Приріст/hвилю: +{{ Math.round(cfg.speedupPerLevel * 100) }}% ·
            Ракетка: {{ cfg.paddleWidth }}px · Життя: {{ cfg.lives }}
          </span>
        </button>
      </div>

      <button class="btn btn-primary" @click="emit('start')">▶ Розпочати гру</button>

      <div class="hints">
        <p>🖱️ Мишка / ⬅️➡️ стрілки / ✋ зап'ясток (камера) — керування</p>
        <p>␣ Space — запуск м'яча · P — пауза</p>
        <p>Розбийте всі 3 хвилі цеглин, збирайте бонуси ● та ×3</p>
      </div>
    </div>
  </div>
</template>

<style scoped src="./arkanoid-panel.css"></style>

<style scoped>
.title {
  font-size: 42px;
  font-weight: 900;
  letter-spacing: 0.18em;
  margin: 0;
  background: linear-gradient(135deg, #7dd3fc, #f472b6 60%, #fbbf24);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.title-icon { filter: drop-shadow(0 0 12px rgba(251, 191, 36, 0.5)); }

.subtitle {
  margin: 0;
  color: #94a3b8;
  font-size: 14px;
}

/* Вибір складності */
.diff-grid {
  display: flex;
  gap: 10px;
  width: 100%;
  max-width: 620px;
}

.diff-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 14px 12px;
  border: 2px solid rgba(148, 163, 184, 0.2);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
  cursor: pointer;
  transition: border-color 0.15s, transform 0.12s, box-shadow 0.15s;
  color: inherit;
  font: inherit;
}

.diff-card:hover { transform: translateY(-2px); }

.diff-card.selected { background: rgba(255, 255, 255, 0.07); }

.diff-name {
  font-size: 16px;
  font-weight: 800;
}

.diff-stats {
  font-size: 11px;
  color: #94a3b8;
  line-height: 1.5;
}

/* Підказки */
.hints {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12.5px;
  color: #64748b;
  text-align: center;
}

.hints p { margin: 0; }

@media (max-width: 640px) {
  .title { font-size: 30px; }
  .diff-grid { flex-direction: column; }
}
</style>
