import { onUnmounted, reactive } from 'vue'

// Логіка для перетягування вікна (Draggable)
export function useDraggable(initial: { x: number; y: number }) {
  const position = reactive({ ...initial })
  const dragOffset = { x: 0, y: 0 }
  let isDragging = false

  const onDrag = (event: MouseEvent): void => {
    if (!isDragging) return
    position.x = event.clientX - dragOffset.x
    position.y = event.clientY - dragOffset.y
  }

  const stopDrag = (): void => {
    isDragging = false
    window.removeEventListener('mousemove', onDrag)
    window.removeEventListener('mouseup', stopDrag)
  }

  const startDrag = (event: MouseEvent): void => {
    isDragging = true
    dragOffset.x = event.clientX - position.x
    dragOffset.y = event.clientY - position.y

    window.addEventListener('mousemove', onDrag)
    window.addEventListener('mouseup', stopDrag)
  }

  onUnmounted(stopDrag)

  return { position, startDrag }
}
