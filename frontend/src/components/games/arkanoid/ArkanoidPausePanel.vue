<script setup lang="ts">
interface Emits {
  (e: 'resume'): void
  (e: 'menu'): void
}

const emit = defineEmits<Emits>()
</script>

<template>
  <div class="overlay">
    <div class="panel small">
      <h2 class="title-2">⏸ Пауза</h2>
      <button class="btn btn-primary" @click="emit('resume')">▶ Продовжити</button>
      <button class="btn btn-ghost" @click="emit('menu')">🏠 Головне меню</button>
    </div>
  </div>
</template>

<style scoped src="./arkanoid-panel.css"></style>
