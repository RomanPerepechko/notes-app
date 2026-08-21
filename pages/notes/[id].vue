<script setup lang="ts">
const route = useRoute()
const notesStore = useNotesStore()

const note = notesStore.findById(String(route.params.id))
</script>

<template>
  <section>
    <template v-if="note !== undefined">
      <h1>Редактирование</h1>
      <NoteEditor :note="note" />
    </template>
    <template v-else>
      <h1>Заметка не найдена</h1>
      <p>Возможно, ее удалили. <NuxtLink to="/">Вернуться к списку</NuxtLink></p>
    </template>
  </section>
</template>
