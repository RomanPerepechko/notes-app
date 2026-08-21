<script setup lang="ts">
import type { Note } from '~/types/note'

const props = defineProps<{ note: Note }>()

const {
  draft,
  canUndo,
  canRedo,
  canDelete,
  isDirty,
  restorable,
  deletedElsewhere,
  restoreDraft,
  discardDraft,
  setTitle,
  setTodoText,
  commitText,
  toggleTodo,
  addTodo,
  removeTodo,
  undo,
  redo,
  save,
  cancel,
  remove,
} = useNoteEditor(props.note)

const confirmation = ref<'cancel' | 'delete' | undefined>()

useHotkeys({ undo, redo })

function askCancel() {
  if (!isDirty.value) {
    cancel()
    return
  }
  confirmation.value = 'cancel'
}

function askDelete() {
  confirmation.value = 'delete'
}

function closeConfirmation() {
  confirmation.value = undefined
}

function onTitleInput(event: Event) {
  if (event.target instanceof HTMLInputElement) {
    setTitle(event.target.value)
  }
}

function onTodoInput(todoId: string, event: Event) {
  if (event.target instanceof HTMLInputElement) {
    setTodoText(todoId, event.target.value)
  }
}
</script>

<template>
  <div class="note-editor">
    <input
      class="note-editor__field note-editor__field--title"
      type="text"
      placeholder="Название"
      :value="draft.title"
      @input="onTitleInput"
      @blur="commitText"
    />

    <ul class="note-editor__todos">
      <li v-for="todo in draft.todos" :key="todo.id" class="note-editor__todo">
        <input type="checkbox" :checked="todo.done" @change="toggleTodo(todo.id)" />
        <input
          class="note-editor__field note-editor__field--todo"
          type="text"
          placeholder="Пункт"
          :value="todo.text"
          @input="onTodoInput(todo.id, $event)"
          @blur="commitText"
        />
        <button
          class="note-editor__drop-todo"
          type="button"
          title="Удалить пункт"
          aria-label="Удалить пункт"
          @click="removeTodo(todo.id)"
        >
          ×
        </button>
      </li>
    </ul>

    <div class="note-editor__actions">
      <button class="note-editor__button" type="button" @click="addTodo">Добавить пункт</button>
      <button
        class="note-editor__button note-editor__button--icon"
        type="button"
        :disabled="!canUndo"
        title="Отменить действие (Ctrl+Z)"
        aria-label="Отменить действие"
        @click="undo"
      >
        <IconUndo />
      </button>
      <button
        class="note-editor__button note-editor__button--icon"
        type="button"
        :disabled="!canRedo"
        title="Вернуть действие (Shift+Ctrl+Z)"
        aria-label="Вернуть действие"
        @click="redo"
      >
        <IconUndo class="note-editor__icon--mirrored" />
      </button>
    </div>

    <div class="note-editor__actions">
      <button class="note-editor__button note-editor__button--primary" type="button" @click="save">Сохранить</button>
      <button class="note-editor__button" type="button" @click="askCancel">Отменить</button>
      <button v-if="canDelete" class="note-editor__button" type="button" @click="askDelete">
        Удалить
      </button>
    </div>

    <BaseModal
      v-if="deletedElsewhere"
      title="Заметка была удалена в другой вкладке"
      confirm-label="Вернуться к списку"
      @cancel="cancel"
      @confirm="cancel"
    >
      Восстановить ее здесь уже нечем: правки этой вкладки не сохранить.
    </BaseModal>

    <BaseModal
      v-else-if="restorable !== undefined"
      title="Восстановить несохраненные изменения?"
      cancel-label="Отбросить"
      confirm-label="Восстановить"
      @cancel="discardDraft"
      @confirm="restoreDraft"
    >
      С прошлого раза остались правки, не дошедшие до сохранения.
    </BaseModal>

    <BaseModal
      v-else-if="confirmation === 'cancel'"
      title="Отменить правки?"
      cancel-label="Продолжить"
      confirm-label="Отменить правки"
      @cancel="closeConfirmation"
      @confirm="cancel"
    >
      Несохраненные изменения будут потеряны.
    </BaseModal>

    <BaseModal
      v-else-if="confirmation === 'delete'"
      title="Удалить заметку?"
      cancel-label="Не удалять"
      confirm-label="Удалить"
      @cancel="closeConfirmation"
      @confirm="remove"
    >
      Заметка и все ее пункты исчезнут без возможности вернуть.
    </BaseModal>
  </div>
</template>

<style scoped lang="scss">
.note-editor {
  display: flex;
  flex-direction: column;
  gap: $space-md;

  &__field {
    padding: $space-sm;
    border: 1px solid $color-border;
    border-radius: $radius;
    background: $color-surface;
    color: $color-text;
    font: inherit;

    &--title {
      width: 100%;
      font-size: 18px;
    }

    &--todo {
      flex: 1;
    }
  }

  &__todos {
    display: flex;
    flex-direction: column;
    gap: $space-sm;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  &__todo {
    display: flex;
    align-items: center;
    gap: $space-sm;
  }

  &__drop-todo {
    padding: 0 $space-sm;
    border: 0;
    background: none;
    color: $color-text;
    font-size: 20px;
    line-height: 1;
    cursor: pointer;
  }

  &__actions {
    display: flex;
    flex-wrap: wrap;
    gap: $space-sm;
  }

  &__button {
    padding: $space-sm $space-md;
    border: 1px solid $color-border;
    border-radius: $radius;
    background: $color-surface;
    color: $color-text;
    cursor: pointer;

    &:disabled {
      opacity: 0.45;
      cursor: default;
    }

    &--primary {
      border-color: $color-accent;
      background: $color-accent;
      color: $color-surface;
    }

    &--icon {
      display: flex;
      align-items: center;
      padding: $space-sm;
    }
  }

  &__icon--mirrored {
    transform: scaleX(-1);
  }
}
</style>
