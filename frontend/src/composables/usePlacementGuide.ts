/**
 * Підказки щодо розміщення кисті в кадрі та журнал подій («що виявлено → що зробити далі»).
 * Журнал містить лише тексти й час, без координат і зображень.
 */
import { getCurrentInstance, onUnmounted, ref, shallowRef } from 'vue'
import { DEFAULT_MODEL_CONFIG, type HintParams } from '@/model/config'
import { PlacementGuide, PLACEMENT_TEXTS, type PlacementIssue } from '@/exercises/placement'
import type { HandFrame } from '@/types/landmarks'

export type GuideLogKind = 'ok' | 'warn' | 'info'

export interface GuideLogEntry {
  id: number
  time: string
  text: string
  kind: GuideLogKind
}

const MAX_ENTRIES = 30

export function usePlacementGuide(
  source: { onFrame(cb: (frame: HandFrame) => void): () => void },
  params: HintParams = DEFAULT_MODEL_CONFIG.hints,
) {
  const guide = new PlacementGuide(params)
  /** Поточна головна підказка ('ok' — все добре) */
  const issue = ref<PlacementIssue | 'ok' | null>(null)
  const text = ref('')
  const log = shallowRef<GuideLogEntry[]>([])
  let seq = 0

  function add(entryText: string, kind: GuideLogKind = 'info') {
    const time = new Date().toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    const entry = { id: ++seq, time, text: entryText, kind }
    log.value = [entry, ...log.value].slice(0, MAX_ENTRIES)
    if (import.meta.env.DEV) console.debug(`[калібрування] ${time} ${entryText}`)
  }

  const off = source.onFrame((frame) => {
    const e = guide.update(frame.landmarks, frame.width, frame.height, frame.timestamp / 1000)
    if (!e) return
    issue.value = e.issue
    text.value = e.text
    add(e.text, e.issue === 'ok' ? 'ok' : 'warn')
  })

  function dispose() {
    off()
  }
  if (getCurrentInstance()) onUnmounted(dispose)

  return { issue, text, log, add, dispose, okText: PLACEMENT_TEXTS.ok }
}
