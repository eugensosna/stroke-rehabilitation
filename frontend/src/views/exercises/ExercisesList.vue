<script setup lang="ts">
// Список вправ пацієнта: доступність за калібруванням, останній результат, перехід до вправи
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import BigButton from '@/components/exercise/BigButton.vue'
import { EXERCISE_LIST, exerciseMetrics, type ExerciseDefinition } from '@/exercises/definitions'
import { useExerciseStore } from '@/store/exercise_store'
import { isGuest } from '@/services/mock_adapter'

const router = useRouter()
const store = useExerciseStore()

onMounted(() => void store.load())

const assigned = computed(() =>
  EXERCISE_LIST.filter((e) => !store.settings || store.settings.exercises.includes(e.id)),
)

function status(def: ExerciseDefinition): 'ok' | 'small' {
  const ranges = store.ranges
  return exerciseMetrics(def).some((m) => ranges[m] && !ranges[m]!.unavailable) ? 'ok' : 'small'
}

function last(def: ExerciseDefinition) {
  return store.series.find((s) => s.exerciseId === def.id) ?? null
}

const guest = isGuest()
const date = (iso: string) => new Date(iso).toLocaleDateString('uk-UA', { day: 'numeric', month: 'long' })
</script>

<template>
  <AdminLayout>
    <div class="space-y-6 text-gray-900 dark:text-white">
      <div class="flex flex-wrap items-center gap-4">
        <h1 class="text-3xl font-bold">Вправи</h1>
        <BigButton class="ml-auto" variant="secondary" @click="router.push('/calibration')">Калібрування</BigButton>
      </div>

      <div
        v-if="guest"
        class="flex flex-wrap items-center gap-4 rounded-2xl border-2 border-blue-700 bg-blue-50 px-5 py-4 text-blue-950"
        data-testid="guest-notice"
      >
        <p class="min-w-0 flex-1 text-xl leading-snug">
          <b>Гостьовий режим.</b> Можна спробувати калібрування і всі вправи без реєстрації. Результати зберігаються лише в
          цьому браузері, фахівець їх не побачить.
        </p>
        <div class="flex flex-wrap gap-3">
          <BigButton variant="secondary" @click="router.push('/signin?redirect=/exercises')">Увійти</BigButton>
          <BigButton variant="secondary" @click="router.push('/signup')">Зареєструватися</BigButton>
        </div>
      </div>

      <p v-if="store.loading" class="text-2xl">Завантаження…</p>
      <p v-if="store.loadError" class="text-2xl text-red-800 dark:text-red-300" role="alert">{{ store.loadError }}</p>
      <p v-if="!store.loading && store.usesDefaultRanges" class="rounded-xl bg-gray-100 px-5 py-4 text-xl text-gray-900 dark:bg-gray-800 dark:text-gray-100">
        Вправи налаштовано за середніми показниками. Калібрування (кілька хвилин) підлаштує їх під вашу кисть — його
        можна пройти будь-коли кнопкою «Калібрування».
      </p>

      <ul class="grid gap-5 md:grid-cols-2">
        <li
          v-for="ex in assigned"
          :key="ex.id"
          class="flex flex-col gap-3 rounded-2xl border border-gray-300 bg-white p-6 dark:border-gray-700 dark:bg-gray-900"
        >
          <h2 class="text-3xl font-bold">{{ ex.gameTitle }}</h2>
          <p class="text-xl font-semibold text-gray-700 dark:text-gray-300">{{ ex.title }}</p>
          <p class="text-2xl leading-snug">{{ ex.instruction }}</p>
          <p v-if="last(ex)" class="text-xl text-gray-800 dark:text-gray-200">
            Минулого разу ({{ date(last(ex)!.startedAt) }}): {{ last(ex)!.successes }} з {{ last(ex)!.attempts }} успішно,
            рівень {{ last(ex)!.endLevel }}
          </p>
          <p v-if="status(ex) === 'small'" class="text-xl text-amber-900 dark:text-amber-300">
            За калібруванням рух поки замалий для цієї вправи.
          </p>
          <div class="mt-auto pt-2">
            <BigButton :disabled="status(ex) === 'small'" @click="router.push(`/exercises/${ex.id}`)">Почати</BigButton>
          </div>
        </li>
      </ul>
    </div>
  </AdminLayout>
</template>
