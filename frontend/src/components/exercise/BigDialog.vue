<script setup lang="ts">
// Модальне вікно з великим шрифтом для інтерфейсу пацієнта
defineProps<{ title: string }>()
defineEmits<{ close: [] }>()
</script>

<template>
  <div class="fixed inset-0 z-99999 flex items-center justify-center p-4">
    <div class="absolute inset-0 bg-gray-900/60" aria-hidden="true" @click="$emit('close')" />
    <section
      role="dialog"
      aria-modal="true"
      :aria-label="title"
      class="relative w-full max-w-2xl rounded-2xl bg-white p-6 text-gray-900 shadow-xl sm:p-8 dark:bg-gray-900 dark:text-white"
    >
      <h2 class="mb-4 text-3xl font-bold">{{ title }}</h2>
      <div class="space-y-4 text-2xl leading-snug">
        <slot />
      </div>
      <div class="mt-6 flex flex-wrap gap-3">
        <slot name="actions" />
      </div>
    </section>
  </div>
</template>
