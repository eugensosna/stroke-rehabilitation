import { onUnmounted, ref, watch } from 'vue'

// Фонова музика: короткий аркадний цикл на басі + арпеджіо
const BASS = [110, 110, 146.8, 110, 130.8, 130.8, 98, 98]
const ARP = [440, 554.4, 659.3, 880, 659.3, 554.4, 587.3, 740]

// Web Audio API — генератор звуків і музики
export function useArkanoidAudio(canPlayMusic: () => boolean) {
  const sfxOn = ref(true)
  const musicOn = ref(true)

  let audioCtx: AudioContext | null = null
  let musicTimer: number | null = null
  let musicStep = 0

  // Виклик ensureAudio реагує на user gesture (кнопки/клік по канвасу)
  function ensureAudio(): AudioContext | null {
    if (!audioCtx) {
      try {
        audioCtx = new AudioContext()
      } catch {
        return null
      }
    }
    if (audioCtx.state === 'suspended') void audioCtx.resume()
    return audioCtx
  }

  function tone(freq: number, duration: number, type: OscillatorType, gainVal: number, when = 0) {
    if (!sfxOn.value) return
    const ac = ensureAudio()
    if (!ac) return
    const osc = ac.createOscillator()
    const gain = ac.createGain()
    osc.type = type
    osc.frequency.value = freq
    const t = ac.currentTime + when
    gain.gain.setValueAtTime(gainVal, t)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration)
    osc.connect(gain).connect(ac.destination)
    osc.start(t)
    osc.stop(t + duration + 0.02)
  }

  function noiseBurst(duration: number, gainVal: number) {
    if (!sfxOn.value) return
    const ac = ensureAudio()
    if (!ac) return
    const len = Math.floor(ac.sampleRate * duration)
    const buffer = ac.createBuffer(1, len, ac.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < len; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / len)
    }
    const src = ac.createBufferSource()
    src.buffer = buffer
    const filter = ac.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 900
    const gain = ac.createGain()
    gain.gain.value = gainVal
    src.connect(filter).connect(gain).connect(ac.destination)
    src.start()
  }

  const sfx = {
    paddle() {
      tone(760, 0.08, 'sine', 0.25)
    },
    wall() {
      tone(420, 0.05, 'triangle', 0.15)
    },
    brick() {
      noiseBurst(0.12, 0.3)
      tone(260, 0.06, 'square', 0.12)
    },
    bonus() {
      tone(520, 0.09, 'sine', 0.2, 0)
      tone(780, 0.09, 'sine', 0.2, 0.09)
      tone(1040, 0.12, 'sine', 0.2, 0.18)
    },
    lose() {
      tone(330, 0.18, 'sawtooth', 0.2, 0)
      tone(220, 0.22, 'sawtooth', 0.2, 0.15)
      tone(120, 0.4, 'sawtooth', 0.25, 0.3)
    },
    win() {
      const notes = [523, 659, 784, 1047]
      notes.forEach((n, i) => tone(n, 0.16, 'triangle', 0.22, i * 0.11))
    },
  }

  function musicTick() {
    if (!musicOn.value) return
    const ac = ensureAudio()
    if (!ac) return
    const step = musicStep % 8
    // Бас
    const osc = ac.createOscillator()
    const gain = ac.createGain()
    osc.type = 'square'
    osc.frequency.value = BASS[step]
    gain.gain.setValueAtTime(0.06, ac.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.22)
    osc.connect(gain).connect(ac.destination)
    osc.start()
    osc.stop(ac.currentTime + 0.24)
    // Арпеджіо через раз
    if (step % 2 === 0) {
      const o2 = ac.createOscillator()
      const g2 = ac.createGain()
      o2.type = 'triangle'
      o2.frequency.value = ARP[step]
      g2.gain.setValueAtTime(0.05, ac.currentTime)
      g2.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.16)
      o2.connect(g2).connect(ac.destination)
      o2.start()
      o2.stop(ac.currentTime + 0.18)
    }
    musicStep++
  }

  function startMusic() {
    if (musicTimer !== null) return
    musicStep = 0
    musicTimer = window.setInterval(musicTick, 250)
  }

  function stopMusic() {
    if (musicTimer !== null) {
      clearInterval(musicTimer)
      musicTimer = null
    }
  }

  watch(musicOn, (on) => {
    if (on && canPlayMusic() && !document.hidden) startMusic()
    else stopMusic()
  })

  onUnmounted(() => {
    stopMusic()
    void audioCtx?.close()
    audioCtx = null
  })

  return { sfxOn, musicOn, sfx, ensureAudio, startMusic, stopMusic }
}
