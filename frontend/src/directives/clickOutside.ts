import type { Directive } from 'vue'

type OutsideHandler = (event: MouseEvent) => void
type ClickOutsideElement = HTMLElement & { clickOutsideEvent?: (event: MouseEvent) => void }

/** v-click-outside: викликає обробник, коли клацнули поза елементом */
const clickOutside: Directive<ClickOutsideElement, OutsideHandler> = {
  created(el, binding) {
    el.clickOutsideEvent = (event: MouseEvent) => {
      if (!(el === event.target || el.contains(event.target as Node))) {
        binding.value(event)
      }
    }
    document.addEventListener('click', el.clickOutsideEvent)
  },
  unmounted(el) {
    if (el.clickOutsideEvent) document.removeEventListener('click', el.clickOutsideEvent)
  },
}

export default clickOutside
