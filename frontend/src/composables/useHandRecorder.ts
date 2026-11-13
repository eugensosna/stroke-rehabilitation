/**
 * Режим запису для експерименту (лише dev, вмикається параметром `?record=1`).
 * Зберігає всі HandFrame сеансу і вивантажує їх у JSON — без зображень.
 */
import { getCurrentInstance, onUnmounted, ref } from 'vue'
import type { HandLandmarksSource } from '@/composables/useHandLandmarks'
import type { HandFrame, HandRecording } from '@/types/landmarks'

/** Режим запису ввімкнено: dev-збірка і параметр ?record=1 */
export function isRecordingEnabled(): boolean {
  if (!import.meta.env.DEV) return false
  return new URLSearchParams(window.location.search).get('record') === '1'
}

export function useHandRecorder(source: Pick<HandLandmarksSource, 'onFrame'>) {
  const enabled = isRecordingEnabled()
  const count = ref(0)
  const frames: HandFrame[] = []

  const off = enabled
    ? source.onFrame((frame) => {
        frames.push(frame)
        count.value = frames.length
      })
    : () => {}

  function clear() {
    frames.length = 0
    count.value = 0
  }

  /** Вивантаження запису у файл JSON */
  function download() {
    const recording: HandRecording = {
      version: 1,
      createdAt: new Date().toISOString(),
      userAgent: navigator.userAgent,
      frames,
    }
    const blob = new Blob([JSON.stringify(recording)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `hand-recording-${recording.createdAt.replace(/[:.]/g, '-')}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (getCurrentInstance()) onUnmounted(off)

  return { enabled, count, download, clear }
}
