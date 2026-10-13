import { ref } from 'vue'
import { AuthStore } from '@/store/auth_store'
import { GameSessionService } from '@/services/game_session_service'
import type { GameMotionRecord, GameSessionRequest, MotionResult, SaveStatus } from '@/types/game'

// MediaPipe може повернути координати трохи за межами кадру
const clamp01 = (value: number) => Math.min(1, Math.max(0, value))

// Ігрова сесія: час початку, рухи, збереження статистики на сервері
export function useGameSession(gameName: string, getMotions: () => MotionResult[]) {
  const authStore = AuthStore()
  const saveStatus = ref<SaveStatus | null>(null)

  // wall-clock для сервера і performance.now() для зсувів рухів
  let sessionStart: Date | null = null
  let sessionStartPerf = 0

  const begin = () => {
    sessionStart = new Date()
    sessionStartPerf = performance.now()
    saveStatus.value = null
  }

  const buildRequest = (): GameSessionRequest | null => {
    if (!sessionStart) return null
    const motions: GameMotionRecord[] = getMotions().map((motion) => ({
      startOffsetMs: Math.max(0, Math.round(motion.startPoint.timestamp - sessionStartPerf)),
      durationMs: motion.durationMs,
      startX: clamp01(motion.startPoint.x),
      startY: clamp01(motion.startPoint.y),
      endX: clamp01(motion.endPoint.x),
      endY: clamp01(motion.endPoint.y),
    }))
    return {
      gameName,
      start: sessionStart.toISOString(),
      durationMs: Math.round(performance.now() - sessionStartPerf),
      motions,
    }
  }

  const save = async () => {
    const request = buildRequest()
    sessionStart = null
    if (!request) return
    if (!authStore.isAuthenticated) {
      saveStatus.value = { type: 'info', text: 'Sign in to save your movement statistics.' }
      return
    }
    saveStatus.value = { type: 'info', text: 'Saving statistics...' }
    try {
      const saved = await GameSessionService.save(request)
      saveStatus.value = {
        type: 'success',
        text: `Statistics saved: ${saved.motionsCount} movements in ${saved.duration} s.`,
      }
    } catch (error) {
      console.error('Failed to save game statistics', error)
      saveStatus.value = { type: 'error', text: 'Could not save statistics to the server.' }
    }
  }

  return { saveStatus, begin, save }
}
