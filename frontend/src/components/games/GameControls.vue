<script setup lang="ts">
interface Props {
  isGameRunning: boolean
}

interface Emits {
  (e: 'start'): void
  (e: 'stop'): void
}

defineProps<Props>()
const emit = defineEmits<Emits>()
</script>

<template>
  <div class="controls">
    <button v-if="!isGameRunning" @click="emit('start')">Start Game</button>
    <button v-else @click="emit('stop')">Stop Game</button>
  </div>
</template>

<style scoped>
.controls {
  display: flex;
  gap: 0.5rem;
}

button {
  padding: 0.5rem 1.25rem;
  font-weight: 500;
  border-radius: 6px;
  cursor: pointer;
}
</style>
