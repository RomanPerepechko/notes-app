<script setup lang="ts">
const notesStore = useNotesStore()

const PREVIEW_LIMIT = 3

const pendingDeleteId = ref<string | undefined>()

function askDelete(id: string) {
  pendingDeleteId.value = id
}

function closeDelete() {
  pendingDeleteId.value = undefined
}

function confirmDelete() {
  if (pendingDeleteId.value !== undefined) {
    notesStore.remove(pendingDeleteId.value)
  }
  pendingDeleteId.value = undefined
}
</script>

<template>
  <section class="notes">
    <div class="notes__head">
      <h1>Заметки</h1>
      <NuxtLink class="notes__create" to="/notes/new">Создать заметку</NuxtLink>
    </div>

    <p v-if="notesStore.notes.length === 0" class="notes__empty">Заметок пока нет.</p>

    <ul v-else class="notes__list">
      <li v-for="note in notesStore.notes" :key="note.id" class="notes__card">
        <div class="notes__card-head">
          <NuxtLink class="notes__title" :to="`/notes/${note.id}`">{{ note.title }}</NuxtLink>
          <button class="notes__delete" type="button" @click="askDelete(note.id)">Удалить</button>
        </div>

        <ul v-if="note.todos.length > 0" class="notes__preview">
          <li
            v-for="todo in note.todos.slice(0, PREVIEW_LIMIT)"
            :key="todo.id"
            class="notes__preview-item"
          >
            <input type="checkbox" :checked="todo.done" disabled />
            <span>{{ todo.text }}</span>
          </li>
        </ul>

        <p v-if="note.todos.length > PREVIEW_LIMIT" class="notes__more">
          ещё {{ note.todos.length - PREVIEW_LIMIT }}
        </p>
      </li>
    </ul>

    <BaseModal
      v-if="pendingDeleteId !== undefined"
      title="Удалить заметку?"
      cancel-label="Не удалять"
      confirm-label="Удалить"
      @cancel="closeDelete"
      @confirm="confirmDelete"
    >
      Заметка и все ее пункты исчезнут без возможности вернуть.
    </BaseModal>
  </section>
</template>

<style scoped lang="scss">
.notes {
  &__head {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    justify-content: space-between;
    gap: $space-sm;
  }

  &__list {
    display: flex;
    flex-direction: column;
    gap: $space-md;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  &__card {
    padding: $space-md;
    border: 1px solid $color-border;
    border-radius: $radius;
    background: $color-surface;
  }

  &__card-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: $space-sm;
  }

  &__title {
    font-size: 18px;
    font-weight: 600;
  }

  &__delete {
    flex: none;
    padding: 0;
    border: 0;
    background: none;
    color: $color-text;
    text-decoration: underline;
    cursor: pointer;
  }

  &__preview {
    display: flex;
    flex-direction: column;
    gap: $space-sm;
    margin: $space-sm 0 0;
    padding: 0;
    list-style: none;
  }

  &__preview-item {
    display: flex;
    align-items: center;
    gap: $space-sm;
  }

  &__more {
    margin-top: $space-sm;
    font-size: 14px;
  }
}
</style>
