<script setup lang="ts">
import type { Note } from '~/types/note'

const props = defineProps<{ note: Note }>()

const {
  draft,
  canUndo,
  canRedo,
  canDelete,
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
        class="note-editor__button"
        type="button"
        :disabled="!canUndo"
        title="Отменить действие (Ctrl+Z)"
        @click="undo"
      >
        Undo
      </button>
      <button
        class="note-editor__button"
        type="button"
        :disabled="!canRedo"
        title="Вернуть действие (Shift+Ctrl+Z)"
        @click="redo"
      >
        Redo
      </button>
    </div>

    <div class="note-editor__actions">
      <button class="note-editor__button note-editor__button--primary" type="button" @click="save">Сохранить</button>
      <button class="note-editor__button" type="button" @click="cancel">Отменить</button>
      <button v-if="canDelete" class="note-editor__button" type="button" @click="remove">Удалить</button>
    </div>
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
  }
}
</style>
