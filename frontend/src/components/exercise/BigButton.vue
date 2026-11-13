<script setup lang="ts">
// Велика кнопка (≥ 48 px заввишки, шрифт ≥ 20 px, контраст за WCAG AA)
withDefaults(defineProps<{ variant?: 'primary' | 'secondary' | 'success' | 'danger'; disabled?: boolean }>(), {
  variant: 'primary',
  disabled: false,
})
defineEmits<{ click: [] }>()
</script>

<template>
  <button
    type="button"
    :disabled="disabled"
    :class="[
      'inline-flex min-h-14 items-center justify-center gap-2 rounded-xl px-6 py-3 text-xl font-semibold transition focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-amber-400 disabled:cursor-not-allowed disabled:opacity-50',
      {
        'bg-blue-700 text-white hover:bg-blue-800': variant === 'primary',
        'border-2 border-gray-700 bg-white text-gray-900 hover:bg-gray-100 dark:border-gray-300 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700':
          variant === 'secondary',
        'bg-green-700 text-white hover:bg-green-800': variant === 'success',
        'bg-red-700 text-white hover:bg-red-800': variant === 'danger',
      },
    ]"
    @click="$emit('click')"
  >
    <slot />
  </button>
</template>
