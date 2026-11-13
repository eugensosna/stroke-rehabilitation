<script setup lang="ts">
// Екран калібрування: покрокові інструкції, відлік, запис, результат кроку, підсумок доступних вправ
import { computed, onMounted, onUnmounted, ref, shallowRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import BigButton from '@/components/exercise/BigButton.vue'
import CameraThumbnail from '@/components/exercise/CameraThumbnail.vue'
import HandDevPanel from '@/components/exercise/HandDevPanel.vue'
import { useCalibration } from '@/composables/useCalibration'
import { useHandLandmarks } from '@/composables/useHandLandmarks'
import { usePlacementGuide } from '@/composables/usePlacementGuide'
import { EXERCISE_LIST } from '@/exercises/definitions'
import { useExerciseStore } from '@/store/exercise_store'
import { isDemoMode, setDemoIntent } from '@/dev/demoHand'
import type { ExerciseId } from '@/types/exercise'

const images = import.meta.glob('@/assets/calibration/*.svg', { eager: true, query: '?url', import: 'default' }) as Record<
  string,
  string
>
const imageUrl = (name: string) => Object.entries(images).find(([path]) => path.endsWith(`/${name}.svg`))?.[1]

const route = useRoute()
const router = useRouter()
const store = useExerciseStore()

const thumb = ref<InstanceType<typeof CameraThumbnail> | null>(null)
const videoRef = computed(() => thumb.value?.video ?? null)
const source = useHandLandmarks(videoRef)
const placement = usePlacementGuide(source)

const calib = shallowRef<ReturnType<typeof useCalibration> | null>(null)
const started = ref(false)
const saving = ref(false)
const saveError = ref<string | null>(null)
const kind = ref<'full' | 'short'>('full')

const nextPath = computed(() => (typeof route.query.next === 'string' ? route.query.next : null))
const exerciseQuery = computed(() =>
  typeof route.query.exercise === 'string' ? (route.query.exercise as ExerciseId) : null,
)

onMounted(async () => {
  void source.start()
  await store.load()
  kind.value = store.calibration && route.query.full !== '1' ? 'short' : 'full'
  const exercises: ExerciseId[] = exerciseQuery.value ? [exerciseQuery.value] : (store.settings?.exercises ?? [])
  calib.value = useCalibration(source, {
    kind: kind.value,
    exercises,
    previous: store.calibration,
    previousAmplitudes: store.previousAmplitudes(),
    config: store.settings ? { calibration: { dxMin: store.settings.dxMin } } : undefined,
  })
})

onUnmounted(() => calib.value?.dispose())

const c = computed(() => calib.value)
const stepImage = computed(() => {
  const s = c.value?.step.value
  if (!s) return undefined
  if (s.image === 'touch') return imageUrl(`touch-${s.finger}`)
  if (s.image === 'flex') return imageUrl(`flex-${s.finger}`)
  return imageUrl(s.image)
})

const resultText = computed(() => {
  const r = c.value?.lastResult.value
  if (!r) return ''
  if (r.status === 'ok') return 'Готово!'
  if (r.status === 'noHand') return 'Кисть було погано видно. Покладіть кисть перед камерою і спробуйте ще раз.'
  return 'Рух замалий. Спробуйте ще раз або пропустіть цей крок.'
})

async function finish() {
  const record = c.value?.record.value
  if (!record) return
  saving.value = true
  saveError.value = null
  const ok = await store.saveCalibration(record)
  saving.value = false
  if (!ok) saveError.value = 'Не вдалося зберегти калібрування на сервері. Його буде використано лише в цьому сеансі.'
}

// калібрування завершено — одразу зберегти результат
watch(
  () => c.value?.phase.value,
  (phase) => {
    if (phase === 'done') void finish()
  },
)

// журнал: події кроків калібрування і що робити далі
watch(
  () => [c.value?.phase.value, c.value?.index.value] as const,
  ([phase], prev) => {
    const cc = c.value
    if (!cc || !phase || phase === prev?.[0]) return
    const n = `Крок ${cc.index.value + 1} з ${cc.steps.length}`
    if (phase === 'ready' && started.value) placement.add(`${n}: ${cc.step.value.title}. Натисніть «Почати крок»`)
    else if (phase === 'prep') placement.add(`${n}: приготуйтеся — ${cc.step.value.title.toLowerCase()}`)
    else if (phase === 'record') placement.add('Запис почато — виконуйте рух до кінця відліку')
    else if (phase === 'result') {
      const ok = cc.lastResult.value?.status === 'ok'
      placement.add(ok ? `${n} виконано. Натисніть «Далі»` : resultText.value, ok ? 'ok' : 'warn')
    } else if (phase === 'done') placement.add('Калібрування завершено', 'ok')
  },
)
watch(started, (v) => {
  if (v) placement.add('Калібрування розпочато')
})

// dev (?demo=1): синтетична кисть виконує рух поточного кроку
if (isDemoMode()) {
  watch(
    () => c.value?.step.value,
    (s) => {
      if (!s) return
      const kind = { rest: 'rest', openClose: 'open', pinch: 'pinch', touch: 'touch', flex: 'flex' } as const
      setDemoIntent({ kind: kind[s.image], k: s.finger })
    },
    { immediate: true },
  )
}

function goOn() {
  void router.push(nextPath.value ?? '/exercises')
}

function restartFull() {
  void router.replace({ path: '/calibration', query: { ...route.query, full: '1' } }).then(() => router.go(0))
}
</script>

<template>
  <AdminLayout>
    <div class="grid gap-5 text-gray-900 lg:grid-cols-[minmax(0,1fr)_340px] dark:text-white">
      <section class="min-w-0 space-y-5">
        <h1 class="text-3xl font-bold">
          {{ kind === 'full' ? 'Калібрування' : 'Коротке калібрування' }}
        </h1>

        <div v-if="!c" class="text-2xl">Завантаження…</div>

        <!-- Вступ -->
        <div v-else-if="!started" class="space-y-5 rounded-2xl border border-gray-300 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
          <p class="text-2xl leading-snug">
            Застосунок запам'ятає, наскільки ви зараз можете рухати пальцями. Від цього залежатиме складність вправ.
          </p>
          <p class="text-2xl leading-snug">
            Буде {{ c.steps.length }} {{ c.steps.length < 5 ? 'кроки' : 'кроків' }}. Для кожного кроку подивіться на малюнок,
            дочекайтеся відліку і виконуйте рух, поки йде запис.
          </p>
          <p class="text-2xl leading-snug">Сядьте так, щоб кисть було добре видно у вебкамері праворуч.</p>
          <p v-if="source.error.value" class="text-2xl font-semibold text-red-800 dark:text-red-300" role="alert">
            {{ source.error.value }}
          </p>
          <div class="flex flex-wrap gap-3">
            <BigButton :disabled="!source.running.value" @click="started = true">Почати калібрування</BigButton>
            <BigButton v-if="kind === 'short'" variant="secondary" @click="restartFull">Повне калібрування</BigButton>
          </div>
          <p v-if="source.loading.value" class="text-xl text-gray-700 dark:text-gray-300">Вмикаємо вебкамеру…</p>
        </div>

        <!-- Підсумок -->
        <div
          v-else-if="c.phase.value === 'done'"
          class="space-y-5 rounded-2xl border border-gray-300 bg-white p-6 dark:border-gray-700 dark:bg-gray-900"
          data-testid="calibration-summary"
        >
          <h2 class="text-3xl font-bold">Калібрування завершено</h2>
          <ul class="space-y-3 text-2xl">
            <li v-for="ex in EXERCISE_LIST" :key="ex.id" class="flex items-center gap-3">
              <span
                :class="[
                  'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xl font-bold text-white',
                  c.available.value.includes(ex.id) ? 'bg-green-700' : 'bg-gray-500',
                ]"
                aria-hidden="true"
              >
                {{ c.available.value.includes(ex.id) ? '✓' : '—' }}
              </span>
              <span>
                <b>{{ ex.title }}</b>:
                {{ c.available.value.includes(ex.id) ? 'доступна' : 'поки недоступна (рух замалий)' }}
              </span>
            </li>
          </ul>
          <p v-if="saveError" class="text-2xl text-red-800 dark:text-red-300" role="alert">{{ saveError }}</p>
          <div class="flex flex-wrap gap-3">
            <BigButton variant="success" :disabled="saving" @click="goOn">
              {{ nextPath ? 'Почати вправу' : 'До вправ' }}
            </BigButton>
          </div>
        </div>

        <!-- Крок -->
        <div v-else class="space-y-5 rounded-2xl border border-gray-300 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
          <p class="text-xl text-gray-700 dark:text-gray-300">Крок {{ c.index.value + 1 }} з {{ c.steps.length }}</p>
          <h2 class="text-3xl font-bold">{{ c.step.value.title }}</h2>
          <div class="flex flex-col gap-6 sm:flex-row sm:items-center">
            <img
              v-if="stepImage"
              :src="stepImage"
              :alt="c.step.value.title"
              class="h-56 w-auto rounded-xl bg-sky-50 p-2"
            />
            <p class="text-2xl leading-snug">{{ c.step.value.instruction }}</p>
          </div>

          <p
            v-if="(c.phase.value === 'prep' || c.phase.value === 'record') && placement.issue.value && placement.issue.value !== 'ok'"
            class="rounded-xl border-2 border-amber-700 bg-amber-50 px-4 py-3 text-2xl font-semibold text-amber-950"
            role="status"
            data-testid="placement-hint"
          >
            {{ placement.text.value }}
          </p>

          <div v-if="c.phase.value === 'prep'" class="flex items-center gap-4" aria-live="assertive">
            <span class="text-2xl">Приготуйтеся…</span>
            <span class="text-7xl font-bold text-blue-800 dark:text-blue-300" data-testid="countdown">{{ c.remaining.value }}</span>
          </div>

          <div v-else-if="c.phase.value === 'record'" class="space-y-3" aria-live="polite">
            <p class="flex items-center gap-3 text-2xl font-semibold text-red-800 dark:text-red-300">
              <span class="inline-block h-5 w-5 animate-pulse rounded-full bg-red-700" aria-hidden="true" />
              Запис… ще {{ c.remaining.value }} с
            </p>
            <div class="h-4 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
              <div class="h-full bg-red-700" :style="{ width: `${c.progress.value * 100}%` }" />
            </div>
          </div>

          <p
            v-else-if="c.phase.value === 'result'"
            :class="[
              'rounded-xl border-2 px-4 py-3 text-2xl font-semibold',
              c.lastResult.value?.status === 'ok'
                ? 'border-green-700 bg-green-50 text-green-900'
                : 'border-amber-700 bg-amber-50 text-amber-950',
            ]"
            role="status"
          >
            {{ resultText }}
          </p>

          <div class="flex flex-wrap gap-3">
            <BigButton v-if="c.phase.value === 'ready'" @click="c.begin()">Почати крок</BigButton>
            <template v-if="c.phase.value === 'result'">
              <BigButton :variant="c.lastResult.value?.status === 'ok' ? 'success' : 'primary'" @click="c.next()">
                Далі
              </BigButton>
              <BigButton variant="secondary" @click="c.retry()">Ще раз</BigButton>
            </template>
            <BigButton v-if="c.phase.value !== 'result' && c.step.value.id !== 'rest'" variant="secondary" @click="c.skip()">
              Пропустити
            </BigButton>
          </div>
        </div>
      </section>

      <aside class="flex flex-col gap-4">
        <CameraThumbnail ref="thumb" :frame="source.lastFrame.value" label="Ваша кисть у вебкамері" />
        <p
          :class="[
            'rounded-xl border-2 px-4 py-3 text-xl font-semibold',
            placement.issue.value === 'ok'
              ? 'border-green-700 bg-green-50 text-green-900'
              : 'border-amber-700 bg-amber-50 text-amber-950',
          ]"
          role="status"
          aria-live="polite"
        >
          {{ placement.issue.value === 'ok' ? `${placement.okText} ✓` : placement.text.value || 'Шукаємо кисть…' }}
        </p>
        <section class="rounded-xl border border-gray-300 bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
          <h2 class="mb-2 text-lg font-semibold">Журнал</h2>
          <ol class="max-h-72 space-y-1 overflow-y-auto text-base" data-testid="calibration-log">
            <li v-for="e in placement.log.value" :key="e.id" class="flex gap-2">
              <span class="shrink-0 text-gray-600 tabular-nums dark:text-gray-400">{{ e.time }}</span>
              <span
                :class="
                  e.kind === 'ok'
                    ? 'text-green-800 dark:text-green-300'
                    : e.kind === 'warn'
                      ? 'text-amber-900 dark:text-amber-300'
                      : 'text-gray-900 dark:text-gray-100'
                "
              >
                {{ e.text }}
              </span>
            </li>
          </ol>
        </section>
        <HandDevPanel :source="source" />
      </aside>
    </div>
  </AdminLayout>
</template>
