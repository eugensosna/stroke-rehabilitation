<script setup lang="ts">
interface Props {
  result: 'gameover' | 'win'
  score: number
}

interface Emits {
  (e: 'restart'): void
  (e: 'menu'): void
}

defineProps<Props>()
const emit = defineEmits<Emits>()
</script>

<template>
  <div class="overlay">
    <div class="panel small">
      <template v-if="result === 'win'">
        <h2 class="title-2 success">🏆 Перемога!</h2>
        <p class="final-score">
          Ви пройшли всі 3 хвилі! Фінальний рахунок: <strong>{{ score }}</strong>
        </p>
      </template>
      <template v-else>
        <h2 class="title-2 danger">💀 Гра закінчена</h2>
        <p class="final-score">Рахунок: <strong>{{ score }}</strong></p>
      </template>

      <!-- Напр. статус збереження статистики -->
      <slot />

      <button class="btn btn-primary" @click="emit('restart')">
        {{ result === 'win' ? '🔄 Грати знову' : '🔄 Спробувати ще' }}
      </button>
      <button class="btn btn-ghost" @click="emit('menu')">🏠 Головне меню</button>
    </div>
  </div>
</template>

<style scoped src="./arkanoid-panel.css"></style>

<style scoped>
.title-2.danger { color: #f87171; text-shadow: 0 0 24px rgba(248, 113, 113, 0.4); }
.title-2.success { color: #34d399; text-shadow: 0 0 24px rgba(52, 211, 153, 0.4); }

.final-score {
  margin: 0;
  font-size: 17px;
  color: #cbd5e1;
}

.final-score strong { color: #7dd3fc; font-size: 22px; }
</style>
