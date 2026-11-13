import { onUnmounted, ref, watch } from 'vue'

const STORAGE_KEY = 'exerciseSoundOn'

function readSetting(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== '0'
  } catch {
    return true
  }
}

/** Звуки вправ (Web Audio): сигнал досягнення цілі, успішне повторення, ноти піаніно; вимикач звуку */
export function useExerciseAudio() {
  const enabled = ref(readSetting())
  let ctx: AudioContext | null = null

  watch(enabled, (on) => {
    try {
      localStorage.setItem(STORAGE_KEY, on ? '1' : '0')
    } catch {
      // налаштування не збережеться між сеансами
    }
  })

  function audio(): AudioContext | null {
    if (!enabled.value) return null
    try {
      ctx ??= new AudioContext()
      if (ctx.state === 'suspended') void ctx.resume()
      return ctx
    } catch {
      return null
    }
  }

  /** Тон заданої частоти, Гц */
  function tone(freq: number, duration = 0.25, delay = 0, volume = 0.18, type: OscillatorType = 'sine') {
    const ac = audio()
    if (!ac) return
    const t0 = ac.currentTime + delay
    const osc = ac.createOscillator()
    const gain = ac.createGain()
    osc.type = type
    osc.frequency.value = freq
    gain.gain.setValueAtTime(0, t0)
    gain.gain.linearRampToValueAtTime(volume, t0 + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration)
    osc.connect(gain).connect(ac.destination)
    osc.start(t0)
    osc.stop(t0 + duration + 0.05)
  }

  /** Досягнення цілі */
  const goal = () => tone(660, 0.18)
  /** Успішне повторення */
  const success = () => {
    tone(523.25, 0.2, 0)
    tone(659.25, 0.2, 0.1)
    tone(783.99, 0.35, 0.2)
  }
  /** Нота (для піаніно) */
  const note = (freq: number) => tone(freq, 0.6, 0, 0.22, 'triangle')

  onUnmounted(() => {
    void ctx?.close()
    ctx = null
  })

  return { enabled, tone, goal, success, note }
}
