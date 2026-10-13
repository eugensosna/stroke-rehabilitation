import { onMounted, watch, type Ref } from 'vue'
import type { CameraMode } from '@/types/arkanoid'
import type { useCameraMode } from './useCameraMode'

const STORAGE_KEY = 'arkanoid.settings'
const CAMERA_MODES: CameraMode[] = ['off', 'canvas-bg', 'float']

export interface ArkanoidSettings {
  cameraMode: CameraMode
  cameraOpacity: number
  handControl: boolean
}

const DEFAULTS: ArkanoidSettings = {
  cameraMode: 'off',
  cameraOpacity: 0.3,
  handControl: true, // зап'ясток за замовчуванням увімкнений у цій грі
}

/** Збережені налаштування; некоректні або відсутні поля — значення за замовчуванням */
export function loadArkanoidSettings(): ArkanoidSettings {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Partial<ArkanoidSettings>
    return {
      cameraMode: CAMERA_MODES.includes(raw.cameraMode as CameraMode) ? (raw.cameraMode as CameraMode) : DEFAULTS.cameraMode,
      cameraOpacity:
        typeof raw.cameraOpacity === 'number' && raw.cameraOpacity >= 0.1 && raw.cameraOpacity <= 0.8
          ? raw.cameraOpacity
          : DEFAULTS.cameraOpacity,
      handControl: typeof raw.handControl === 'boolean' ? raw.handControl : DEFAULTS.handControl,
    }
  } catch {
    return { ...DEFAULTS }
  }
}

function saveArkanoidSettings(settings: ArkanoidSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // приватний режим / заблоковане сховище — налаштування просто не збережуться
  }
}

// Відновлює показ камери при завантаженні і зберігає зміни налаштувань у localStorage
export function useArkanoidSettings(
  saved: ArkanoidSettings,
  camera: ReturnType<typeof useCameraMode>,
  handControl: Ref<boolean>,
) {
  camera.opacity.value = saved.cameraOpacity

  onMounted(() => {
    if (saved.cameraMode !== 'off') void camera.setMode(saved.cameraMode)
  })

  watch([camera.mode, camera.opacity, handControl], ([cameraMode, cameraOpacity, hand]) => {
    saveArkanoidSettings({ cameraMode, cameraOpacity, handControl: hand })
  })
}
