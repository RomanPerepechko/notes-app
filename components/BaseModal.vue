<script setup lang="ts">
defineProps<{ title: string; confirmLabel: string; cancelLabel?: string }>()

const emit = defineEmits<{ confirm: []; cancel: [] }>()

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

const dialog = ref<HTMLElement | null>(null)
const titleId = useId()

let opener: Element | null = null
let pressedOnBackdrop = false

function focusableItems(): HTMLElement[] {
  if (dialog.value === null) {
    return []
  }
  return Array.from(dialog.value.querySelectorAll<HTMLElement>(FOCUSABLE))
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    emit('cancel')
    return
  }
  if (event.key !== 'Tab') {
    return
  }
  const items = focusableItems()
  if (items.length === 0 || dialog.value === null) {
    return
  }
  const first = items[0]
  const last = items[items.length - 1]
  const active = document.activeElement

  if (active === null || !dialog.value.contains(active)) {
    event.preventDefault()
    if (event.shiftKey) {
      last.focus()
    } else {
      first.focus()
    }
    return
  }
  if (event.shiftKey && active === first) {
    event.preventDefault()
    last.focus()
    return
  }
  if (!event.shiftKey && active === last) {
    event.preventDefault()
    first.focus()
  }
}

function onBackdropMousedown(event: MouseEvent) {
  pressedOnBackdrop = event.target === event.currentTarget
}

function onBackdropClick(event: MouseEvent) {
  if (pressedOnBackdrop && event.target === event.currentTarget) {
    emit('cancel')
  }
  pressedOnBackdrop = false
}

onMounted(() => {
  opener = document.activeElement
  document.addEventListener('keydown', onKeydown)
  const items = focusableItems()
  if (items.length > 0) {
    items[0].focus()
  }
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown)
  if (opener instanceof HTMLElement) {
    opener.focus()
  }
})
</script>

<template>
  <Teleport to="body">
    <div class="base-modal" @mousedown="onBackdropMousedown" @click="onBackdropClick">
      <div
        ref="dialog"
        class="base-modal__dialog"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="titleId"
      >
        <h2 :id="titleId" class="base-modal__title">{{ title }}</h2>
        <p class="base-modal__text"><slot /></p>
        <div class="base-modal__actions">
          <button
            v-if="cancelLabel !== undefined"
            class="base-modal__button"
            type="button"
            @click="emit('cancel')"
          >
            {{ cancelLabel }}
          </button>
          <button
            class="base-modal__button base-modal__button--primary"
            type="button"
            @click="emit('confirm')"
          >
            {{ confirmLabel }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped lang="scss">
.base-modal {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: $space-md;
  background: rgba($color-text, 0.45);

  &__dialog {
    width: 100%;
    max-width: 420px;
    padding: $space-lg;
    border: 1px solid $color-border;
    border-radius: $radius;
    background: $color-surface;
  }

  &__title {
    margin: 0 0 $space-sm;
    font-size: 18px;
  }

  &__text {
    margin: 0 0 $space-lg;
  }

  &__actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: $space-sm;
  }

  &__button {
    padding: $space-sm $space-md;
    border: 1px solid $color-border;
    border-radius: $radius;
    background: $color-surface;
    color: $color-text;
    cursor: pointer;

    &--primary {
      border-color: $color-accent;
      background: $color-accent;
      color: $color-surface;
    }
  }
}
</style>
