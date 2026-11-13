<script setup lang="ts">
/**
 * Спільна оболонка ігрової вправи: полотно гри (слот), мініатюра камери зі скелетом,
 * підказки, прогрес серії, бали, рівень, звук, пауза, резервний режим, екран результату.
 */
import { computed, onMounted, ref, watchEffect } from 'vue'
import { useRouter } from 'vue-router'
import BigButton from './BigButton.vue'
import BigDialog from './BigDialog.vue'
import CameraThumbnail from './CameraThumbnail.vue'
import HandDevPanel from './HandDevPanel.vue'
import { useExercise } from '@/composables/useExercise'
import { useExerciseAudio } from '@/composables/useExerciseAudio'
import { useHandLandmarks } from '@/composables/useHandLandmarks'
import { FINGER_NAMES, type ExerciseDefinition } from '@/exercises/definitions'
import type { Finger } from '@/model/config'
import { useExerciseStore } from '@/store/exercise_store'
import { isDemoMode, setDemoIntent } from '@/dev/demoHand'
import type { CalibrationRanges, ExerciseSettings } from '@/types/exercise'

const props = withDefaults(
  defineProps<{
    definition: ExerciseDefinition
    calibration: CalibrationRanges
    settings: ExerciseSettings
    startLevel: number
    initialTarget?: Finger | null
    /** Грати стандартний сигнал успіху (піаніно грає власні ноти) */
    successSound?: boolean
    /** Калібрування ще не проходили — використовуються типові діапазони */
    defaultRanges?: boolean
  }>(),
  { initialTarget: undefined, successSound: true, defaultRanges: false },
)

const router = useRouter()
const store = useExerciseStore()
const thumb = ref<InstanceType<typeof CameraThumbnail> | null>(null)
const videoRef = computed(() => thumb.value?.video ?? null)

const source = useHandLandmarks(videoRef)
const exercise = useExercise(props.definition, props.calibration, props.settings, source, {
  startLevel: props.startLevel,
  target: props.initialTarget,
})
const audio = useExerciseAudio()

type Screen = 'intro' | 'playing' | 'result'
const screen = ref<Screen>('intro')
const showLowFps = ref(false)
const switching = ref(false)

exercise.on('goalReached', () => audio.goal())
exercise.on('success', () => {
  if (props.successSound) audio.success()
})
exercise.on('seriesComplete', async () => {
  screen.value = 'result'
  const saved = await exercise.save()
  if (saved) store.addSeries(saved)
})
source.onLowFps(() => {
  if (screen.value !== 'result') showLowFps.value = true
})

onMounted(() => {
  void source.start()
})

// dev (?demo=1): синтетична кисть виконує рух поточної вправи
if (isDemoMode()) {
  watchEffect(() => {
    const k = exercise.target.value ?? undefined
    const kind = {
      pinch: 'pinch',
      opposition: 'touch',
      keypad: 'point',
      openClose: 'open',
      isolatedFinger: 'flex',
      arkanoid: 'sweep',
      arkade2: 'sweep',
    } as const
    setDemoIntent({ kind: kind[props.definition.id], k })
  })
}

function begin() {
  screen.value = 'playing'
  exercise.start()
}

function again() {
  screen.value = 'playing'
  exercise.restart()
}

async function acceptRemote() {
  switching.value = true
  const ok = await source.setMode('remote')
  switching.value = false
  showLowFps.value = false
  if (!ok && !source.error.value) source.error.value = 'Не вдалося увімкнути резервний режим.'
}

// підсвічується кінчик заданого пальця або пальця-вказівника
const highlight = computed(() => {
  const k = exercise.feedback.value.pointer?.finger ?? exercise.target.value
  return k ? [4 * k] : []
})
const report = computed(() => (screen.value === 'result' ? exercise.report() : null))
const fmt = (v: number | null | undefined, digits = 0) =>
  v === null || v === undefined
    ? '—'
    : v.toLocaleString('uk-UA', { minimumFractionDigits: digits, maximumFractionDigits: digits })
const statusClass = computed(() => {
  const t = exercise.saveStatus.value?.type
  return t === 'success'
    ? 'border-green-700 bg-green-50 text-green-900'
    : t === 'error'
      ? 'border-red-700 bg-red-50 text-red-900'
      : 'border-blue-700 bg-blue-50 text-blue-900'
})
const paused = computed(() => screen.value === 'playing' && exercise.state.value === 'Paused')
</script>

<template>
  <div class="exercise-shell grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
    <section class="flex min-w-0 flex-col gap-4">
      <header class="flex flex-wrap items-center gap-x-6 gap-y-2 text-gray-900 dark:text-white">
        <h1 class="text-3xl font-bold">
          {{ definition.gameTitle }}
          <span class="block text-xl font-medium text-gray-700 dark:text-gray-300">{{ definition.title }}</span>
        </h1>
        <dl class="ml-auto flex flex-wrap gap-x-6 gap-y-1 text-2xl" aria-live="polite">
          <div>
            <dt class="mr-1 inline text-gray-700 dark:text-gray-300">Повторення:</dt>
            <dd class="inline font-bold" data-testid="progress">{{ exercise.repetitions.value }} з {{ exercise.total.value }}</dd>
          </div>
          <div>
            <dt class="mr-1 inline text-gray-700 dark:text-gray-300">Бали:</dt>
            <dd class="inline font-bold">{{ exercise.score.value }}</dd>
          </div>
          <div>
            <dt class="mr-1 inline text-gray-700 dark:text-gray-300">Рівень:</dt>
            <dd class="inline font-bold">{{ exercise.level.value }}</dd>
          </div>
        </dl>
      </header>

      <div
        class="h-3 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700"
        role="progressbar"
        :aria-valuenow="exercise.repetitions.value"
        :aria-valuemax="exercise.total.value"
        aria-label="Виконано повторень у серії"
      >
        <div
          class="h-full bg-green-700 transition-all"
          :style="{ width: `${(100 * exercise.repetitions.value) / exercise.total.value}%` }"
        />
      </div>

      <div class="game-area relative overflow-hidden rounded-2xl border border-gray-300 bg-white dark:border-gray-700">
        <slot :exercise="exercise" :audio="audio" :active="screen === 'playing'" />

        <!-- Підказка -->
        <div
          v-if="screen === 'playing' && exercise.hint.value && !paused"
          class="absolute inset-x-4 top-4 rounded-xl bg-amber-100 px-5 py-3 text-center text-2xl font-semibold text-amber-950 shadow"
          role="status"
          data-testid="hint"
        >
          {{ exercise.hint.value.text }}
        </div>

        <!-- Пауза: кисть втрачено -->
        <div
          v-if="paused"
          class="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white/90 p-6 text-center dark:bg-gray-900/90"
          role="alert"
        >
          <p class="text-4xl font-bold text-gray-900 dark:text-white">Пауза</p>
          <p class="max-w-xl text-2xl text-gray-800 dark:text-gray-200">
            Кисть не видно. Покладіть кисть перед камерою, і вправа продовжиться.
          </p>
        </div>

        <!-- Початок серії -->
        <div
          v-if="screen === 'intro'"
          class="absolute inset-0 flex flex-col items-center justify-center gap-5 bg-white/95 p-6 text-center dark:bg-gray-900/95"
        >
          <p class="max-w-2xl text-2xl leading-snug text-gray-900 dark:text-white">{{ definition.instruction }}</p>
          <p v-if="exercise.target.value" class="text-2xl text-gray-800 dark:text-gray-200">
            Палець: <b>{{ FINGER_NAMES[exercise.target.value] }}</b>
          </p>
          <p v-if="defaultRanges" class="max-w-2xl text-xl text-gray-700 dark:text-gray-300" data-testid="default-ranges">
            Використовуються середні показники. Якщо вправа здається надто легкою чи важкою, пройдіть калібрування.
          </p>
          <p v-if="source.loading.value" class="text-2xl text-gray-700 dark:text-gray-300">
            Вмикаємо вебкамеру і завантажуємо модель розпізнавання кисті…
          </p>
          <p v-if="source.error.value" class="text-2xl font-semibold text-red-800 dark:text-red-300" role="alert">
            {{ source.error.value }}
          </p>
          <div class="flex flex-wrap justify-center gap-3">
            <BigButton :disabled="!source.running.value" @click="begin">Почати</BigButton>
            <BigButton v-if="source.error.value && !source.running.value" variant="secondary" @click="source.start()">
              Спробувати ще раз
            </BigButton>
            <BigButton
              v-if="defaultRanges"
              variant="secondary"
              @click="router.push({ path: '/calibration', query: { exercise: definition.id, next: `/exercises/${definition.id}` } })"
            >
              Калібрування
            </BigButton>
          </div>
        </div>

        <!-- Результат серії -->
        <div
          v-if="screen === 'result' && report"
          class="absolute inset-0 overflow-y-auto bg-white p-6 text-gray-900 dark:bg-gray-900 dark:text-white"
          data-testid="result"
        >
          <h2 class="mb-4 text-3xl font-bold">Серію завершено!</h2>
          <dl class="grid gap-x-8 gap-y-2 text-2xl sm:grid-cols-2">
            <div><dt class="inline">Успішних повторень:</dt> <dd class="inline font-bold">{{ report.successes }} з {{ report.attempts }}</dd></div>
            <div><dt class="inline">Бали:</dt> <dd class="inline font-bold">{{ exercise.score.value }}</dd></div>
            <div><dt class="inline">Рівень:</dt> <dd class="inline font-bold">{{ report.startLevel }} → {{ report.endLevel }}</dd></div>
            <div>
              <dt class="mr-1 inline">Темп:</dt>
              <dd class="inline font-bold">{{ report.frequencyHz ? `${fmt(report.frequencyHz * 60)} за хвилину` : '—' }}</dd>
            </div>
            <div v-if="report.meanIsolation !== null">
              <dt class="inline">Ізольованість:</dt> <dd class="inline font-bold">{{ fmt(report.meanIsolation * 100) }} %</dd>
            </div>
            <div><dt class="inline">Тривалість:</dt> <dd class="inline font-bold">{{ fmt(report.activeDurationMin, 1) }} хв</dd></div>
          </dl>
          <p v-if="exercise.saveStatus.value" :class="['mt-5 rounded-xl border-2 px-4 py-3 text-2xl', statusClass]" role="status">
            {{ exercise.saveStatus.value.text }}
          </p>
          <div class="mt-6 flex flex-wrap gap-3">
            <BigButton variant="success" @click="again">Ще одна серія</BigButton>
            <BigButton v-if="exercise.saveStatus.value?.type === 'error'" variant="secondary" @click="exercise.save()">
              Зберегти ще раз
            </BigButton>
            <BigButton variant="secondary" @click="router.push('/exercises')">До списку вправ</BigButton>
          </div>
        </div>
      </div>
    </section>

    <aside class="flex flex-col gap-4">
      <CameraThumbnail ref="thumb" :frame="source.lastFrame.value" :highlight="highlight" label="Ваша кисть у вебкамері" />
      <p v-if="source.mode.value === 'remote'" class="rounded-xl bg-blue-50 px-4 py-2 text-lg text-blue-950">
        Резервний режим: кадри обробляються на сервері й не зберігаються.
      </p>
      <BigButton variant="secondary" :aria-pressed="audio.enabled.value" @click="audio.enabled.value = !audio.enabled.value">
        {{ audio.enabled.value ? 'Звук увімкнено' : 'Звук вимкнено' }}
      </BigButton>
      <BigButton v-if="screen === 'playing'" variant="secondary" @click="exercise.finish()">Завершити серію</BigButton>
      <BigButton v-if="screen !== 'playing'" variant="secondary" @click="router.push('/exercises')">До списку вправ</BigButton>
      <HandDevPanel :source="source" />
    </aside>

    <BigDialog v-if="showLowFps" title="Відео обробляється повільно" @close="showLowFps = false">
      <p>
        Ваш пристрій обробляє лише {{ fmt(source.fps.value) }} кадрів за секунду. Через це гра може реагувати із запізненням.
      </p>
      <p>
        Можна перейти в резервний режим: кадри з камери будуть передаватися на сервер захищеним з'єднанням, там
        розпізнаватимуться і одразу видалятимуться. Зображення не зберігаються.
      </p>
      <template #actions>
        <BigButton :disabled="switching" @click="acceptRemote">Перейти в резервний режим</BigButton>
        <BigButton variant="secondary" @click="showLowFps = false">Залишитися</BigButton>
      </template>
    </BigDialog>
  </div>
</template>

<style scoped>
.game-area {
  aspect-ratio: 16 / 10;
  min-height: 320px;
}
</style>
