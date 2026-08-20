<script setup lang="ts">
import type { Note } from '~/types/note'

const note: Note = {
  id: crypto.randomUUID(),
  title: '',
  todos: [],
  updatedAt: Date.now(),
}
</script>

<template>
  <section>
    <h1>Новая заметка</h1>
    <NoteEditor :note="note" />
  </section>
</template>
