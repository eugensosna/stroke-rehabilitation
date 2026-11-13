<script setup lang="ts">
import { computed } from 'vue'
import type { HandLandmarksSource } from '@/composables/useHandLandmarks'
import { useHandRecorder } from '@/composables/useHandRecorder'

// Dev-панель джерела ключових точок: частота обробки, частка кадрів з кистю, режим, запис
const props = defineProps<{ source: HandLandmarksSource }>()

const recorder = useHandRecorder(props.source)
const visible = import.meta.env.DEV
const fpsText = computed(() => props.source.fps.value.toFixed(1))
const rateText = computed(() => `${Math.round(props.source.detectionRate.value * 100)} %`)
const modeText = computed(() => (props.source.mode.value === 'local' ? 'локальний' : 'резервний'))
const fpsLow = computed(() => props.source.fps.value > 0 && props.source.fps.value < props.source.config.minFps)
</script>

<template>
  <div v-if="visible" class="dev-panel" data-testid="hand-dev-panel">
    <span>Режим: <b>{{ modeText }}</b></span>
    <span :class="{ low: fpsLow }">Частота: <b>{{ fpsText }}</b> кадр/с</span>
    <span>Кадри з кистю: <b>{{ rateText }}</b></span>
    <span>Рука: <b>{{ source.lastFrame.value?.handedness === 'Right' ? 'права' : source.lastFrame.value?.handedness === 'Left' ? 'ліва' : '—' }}</b></span>
    <template v-if="recorder.enabled">
      <span>Записано кадрів: <b>{{ recorder.count.value }}</b></span>
      <button type="button" @click="recorder.download">Зберегти запис</button>
      <button type="button" @click="recorder.clear">Очистити</button>
    </template>
  </div>
</template>

<style scoped>
.dev-panel {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem 1rem;
  align-items: center;
  padding: 0.4rem 0.75rem;
  border: 1px dashed #94a3b8;
  border-radius: 8px;
  font: 13px/1.4 ui-monospace, monospace;
  color: #334155;
  background: #f8fafc;
}
.dev-panel .low b {
  color: #b91c1c;
}
.dev-panel button {
  padding: 0.15rem 0.6rem;
  border: 1px solid #64748b;
  border-radius: 6px;
  background: #fff;
}
:global(.dark) .dev-panel {
  color: #e2e8f0;
  background: #0f172a;
}
</style>
