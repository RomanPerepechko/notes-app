import { onBeforeUnmount, onMounted } from 'vue'

interface HotkeyActions {
  undo: () => void
  redo: () => void
}

// уступаем событие только полям с собственным undo: у чекбокса или кнопки его нет, и отданный им Ctrl+Z не сделал бы ничего
const TEXT_INPUT_TYPES = new Set(['text', 'search', 'url', 'tel', 'email', 'password'])

function isTextEntry(target: EventTarget | null): boolean {
  if (target instanceof HTMLTextAreaElement) {
    return true
  }
  if (target instanceof HTMLInputElement) {
    return TEXT_INPUT_TYPES.has(target.type)
  }
  return target instanceof HTMLElement && target.isContentEditable
}

export function useHotkeys(actions: HotkeyActions) {
  function onKeydown(event: KeyboardEvent) {
    if (event.code !== 'KeyZ' || !(event.ctrlKey || event.metaKey)) {
      return
    }

    if (isTextEntry(event.target)) {
      return
    }
    event.preventDefault()
    if (event.shiftKey) {
      actions.redo()
      return
    }
    actions.undo()
  }

  onMounted(() => window.addEventListener('keydown', onKeydown))
  onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
}
