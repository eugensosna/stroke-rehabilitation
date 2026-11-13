<script setup lang="ts">
// Сторінка вправи: завантажує налаштування і калібрування, показує оболонку з відповідною грою
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import BigButton from '@/components/exercise/BigButton.vue'
import ExerciseShell from '@/components/exercise/ExerciseShell.vue'
import { EXERCISE_LIST, EXERCISES } from '@/exercises/definitions'
import { useExerciseStore } from '@/store/exercise_store'
import type { ExerciseId } from '@/types/exercise'
import type { Finger } from '@/model/config'
import BalloonFlight from './BalloonFlight.vue'
import CodeLock from './CodeLock.vue'
import ArkanoidExercise from './ArkanoidExercise.vue'
import Arkade2Exercise from './Arkade2Exercise.vue'
import PinchGarden from './PinchGarden.vue'

const route = useRoute()
const router = useRouter()
const store = useExerciseStore()
const ready = ref(false)

const id = computed(() => route.params.id as ExerciseId)
const definition = computed(() => EXERCISES[id.value])

/** Пальці з достатнім діапазоном калібрування */
const availableFingers = computed<Finger[]>(() => {
  const def = definition.value
  const ranges = store.ranges
  return (def?.targets ?? []).filter((k) => {
    const r = ranges[def.metric(k)]
    return r && !r.unavailable
  })
})
const available = computed(() => {
  const def = definition.value
  if (!def) return false
  if (def.targets) return availableFingers.value.length > 0
  const r = store.ranges[def.metric(null)]
  return !!r && !r.unavailable
})

onMounted(async () => {
  // лише вправи, для яких є гра
  if (!definition.value || !EXERCISE_LIST.includes(definition.value)) {
    void router.replace('/exercises')
    return
  }
  await store.load()
  ready.value = true
})
</script>

<template>
  <AdminLayout>
    <div v-if="!ready" class="p-6 text-2xl text-gray-800 dark:text-gray-200">Завантаження…</div>

    <div v-else-if="!available" class="max-w-3xl space-y-5 p-2 text-gray-900 dark:text-white">
      <h1 class="text-3xl font-bold">{{ definition.title }}</h1>
      <p class="text-2xl">
        За результатами калібрування рух для цієї вправи замалий. Повторіть калібрування або оберіть іншу вправу.
      </p>
      <div class="flex flex-wrap gap-3">
        <BigButton @click="router.push({ path: '/calibration', query: { exercise: definition.id, next: route.fullPath } })">
          Повторити калібрування
        </BigButton>
        <BigButton variant="secondary" @click="router.push('/exercises')">До списку вправ</BigButton>
      </div>
    </div>

    <ExerciseShell
      v-else
      :key="definition.id"
      :definition="definition"
      :calibration="store.ranges"
      :default-ranges="store.usesDefaultRanges"
      :settings="store.settings!"
      :start-level="store.startLevel(definition.id)"
      :initial-target="availableFingers[0] ?? definition.defaultTarget"
    >
      <template #default="{ exercise, audio }">
        <PinchGarden v-if="definition.id === 'pinch'" :exercise="exercise" />
        <CodeLock v-else-if="definition.id === 'keypad'" :exercise="exercise" />
        <BalloonFlight
          v-else-if="definition.id === 'openClose'"
          :exercise="exercise"
          :frequency-hz="store.settings!.targetFrequencyHz"
        />
        <ArkanoidExercise v-else-if="definition.id === 'arkanoid'" :exercise="exercise" />
        <Arkade2Exercise v-else-if="definition.id === 'arkade2'" :exercise="exercise" :sound="audio.enabled.value" />
      </template>
    </ExerciseShell>
  </AdminLayout>
</template>
