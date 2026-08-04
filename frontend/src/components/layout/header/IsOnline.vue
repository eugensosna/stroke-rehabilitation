<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { OnLineService } from '@/services/online'

const isOnline = ref(false)

const checkIsOnline = async () => {
  isOnline.value = await OnLineService.checkIsOnline()
}

onMounted(() => {
  checkIsOnline()
})
</script>
<template>
  <div v-if="isOnline" class="flex items-center gap-2 text-green-500">
    <span class="w-2 h-2 rounded-full bg-green-500 animate-pulse">
    </span>
    <img src="/images/icons/on-line.svg" alt="grid" />
    <span>Online</span>
  </div>
  <div v-else class="flex items-center gap-2 text-red-500">
    <span class="w-2 h-2 rounded-full bg-red-500 animate-pulse">
    </span>
    <img src="/images/icons/off-line.svg" alt="grid" />
    <span>Offline</span>
  </div>
</template>
