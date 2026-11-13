import { onMounted, onUnmounted, type Ref } from 'vue'

/**
 * Цикл відмальовування Canvas 2D: власний requestAnimationFrame (незалежний від частоти камери),
 * коректна зміна розміру полотна з урахуванням devicePixelRatio, без витоків rAF при виході зі сторінки.
 */
export function useCanvasLoop(
  canvasRef: Ref<HTMLCanvasElement | null>,
  frame: (ctx: CanvasRenderingContext2D, width: number, height: number, dt: number) => void,
) {
  let rafId: number | null = null
  let last = 0
  let width = 0
  let height = 0
  let observer: ResizeObserver | null = null

  function resize() {
    const canvas = canvasRef.value
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    width = Math.max(1, rect.width)
    height = Math.max(1, rect.height)
    canvas.width = Math.round(width * dpr)
    canvas.height = Math.round(height * dpr)
    canvas.getContext('2d')?.setTransform(dpr, 0, 0, dpr, 0, 0)
  }

  function tick(now: number) {
    rafId = requestAnimationFrame(tick)
    const ctx = canvasRef.value?.getContext('2d')
    if (!ctx) return
    // після згортання вкладки не «перестрибуємо» на великий крок
    const dt = last ? Math.min(0.1, (now - last) / 1000) : 0
    last = now
    frame(ctx, width, height, dt)
  }

  onMounted(() => {
    resize()
    observer = new ResizeObserver(resize)
    if (canvasRef.value) observer.observe(canvasRef.value)
    rafId = requestAnimationFrame(tick)
  })

  onUnmounted(() => {
    if (rafId !== null) cancelAnimationFrame(rafId)
    rafId = null
    observer?.disconnect()
    observer = null
  })
}
