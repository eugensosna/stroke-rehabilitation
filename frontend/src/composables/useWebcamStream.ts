import { onUnmounted, ref, shallowRef, type Ref } from 'vue'

function describeError(err: unknown): string {
  const name = (err as DOMException)?.name
  if (name === 'NotAllowedError') return 'Дозвіл на камеру не надано — гра працює без камери.'
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') return 'Камеру не знайдено — гра працює без камери.'
  if (name === 'NotReadableError') return 'Камера зайнята іншою програмою — гра працює без камери.'
  return 'Камера недоступна — гра працює у звичайному режимі.'
}

/** Підключає потік до video-елемента і запускає відтворення */
export function playStream(video: HTMLVideoElement | null, stream: MediaStream | null) {
  if (!video || !stream) return
  video.srcObject = stream
  void video.play().catch(() => {})
}

// Потік веб-камери (getUserMedia), що відтворюється у videoRef
export function useWebcamStream(videoRef: Ref<HTMLVideoElement | null>) {
  const stream = shallowRef<MediaStream | null>(null)
  const loading = ref(false)
  const error = ref('')
  let pending: Promise<boolean> | null = null

  /** true — потік активний; повторно використовує вже ввімкнену камеру */
  function enable(): Promise<boolean> {
    // одночасні виклики (напр. відновлення налаштувань) чекають один запит до камери
    pending ??= requestStream().finally(() => {
      pending = null
    })
    return pending
  }

  async function requestStream(): Promise<boolean> {
    loading.value = true
    error.value = ''
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('not-supported')
      }
      stream.value ??= await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 }, audio: false })
      playStream(videoRef.value, stream.value)
      return true
    } catch (err) {
      error.value = describeError(err)
      return false
    } finally {
      loading.value = false
    }
  }

  function stop() {
    stream.value?.getTracks().forEach((t) => t.stop())
    stream.value = null
    loading.value = false
    error.value = ''
  }

  onUnmounted(stop)

  return { stream, loading, error, enable, stop }
}
