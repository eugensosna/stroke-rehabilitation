<script setup lang="ts">
import type { SaveStatus } from '@/types/game'

interface Props {
  status: SaveStatus | null
  isAuthenticated: boolean
  /** Куди повернутися після входу */
  redirectPath: string
}

defineProps<Props>()
</script>

<template>
  <div v-if="status" class="save-status" :class="`save-status--${status.type}`">
    {{ status.text }}
    <router-link v-if="status.type === 'info' && !isAuthenticated" :to="`/signin?redirect=${redirectPath}`">
      Sign in
    </router-link>
  </div>
</template>

<style scoped>
.save-status {
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-size: 0.875rem;
}

.save-status a {
  margin-left: 0.5rem;
  text-decoration: underline;
}

.save-status--info {
  color: #1d4ed8;
  background-color: #eff6ff;
}

.save-status--success {
  color: #15803d;
  background-color: #f0fdf4;
}

.save-status--error {
  color: #dc2626;
  background-color: #fef2f2;
}
</style>
