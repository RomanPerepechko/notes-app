<script setup lang="ts">
const route = useRoute()
const notesStore = useNotesStore()

const note = computed(() => notesStore.findById(String(route.params.id)))
</script>

<template>
  <section>
    <h1>Редактирование</h1>
    <NoteEditor v-if="note" :note="note" />
    <p v-else>Заметка не найдена. <NuxtLink to="/">К списку</NuxtLink></p>
  </section>
</template>
