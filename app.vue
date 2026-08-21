<script setup lang="ts">
const notesStore = useNotesStore()
</script>

<template>
  <div class="app">
    <NuxtPage />
    <p v-if="notesStore.persistFailed" class="app__notice" role="status">
      Не удалось сохранить данные в этом браузере - изменения живут только до закрытия вкладки.
      <button class="app__notice-dismiss" type="button" @click="notesStore.setPersistFailed(false)">
        Скрыть
      </button>
    </p>
  </div>
</template>

<style scoped lang="scss">
.app {
  max-width: 720px;
  margin: 0 auto;
  padding: $space-lg $space-md;

  &__notice {
    position: fixed;
    bottom: $space-md;
    left: $space-md;
    max-width: 420px;

    @include mobile {
      right: $space-md;
    }

    padding: $space-sm $space-md;
    border: 1px solid $color-border;
    border-radius: $radius;
    background: $color-surface;
    font-size: 14px;
  }

  &__notice-dismiss {
    margin-left: $space-sm;
    padding: 0;
    border: 0;
    background: none;
    color: $color-accent;
    text-decoration: underline;
    cursor: pointer;
  }
}
</style>
