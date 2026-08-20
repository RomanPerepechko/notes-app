import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Note } from '~/types/note'
import { readState } from '~/utils/storage'

export const useNotesStore = defineStore('notes', () => {
  const notes = ref<Note[]>([])
  const persistFailed = ref(false)

  function load() {
    notes.value = readState().notes
  }

  function upsert(note: Note) {
    const index = notes.value.findIndex((item) => item.id === note.id)
    if (index === -1) {
      notes.value.unshift(note)
      return
    }
    notes.value.splice(index, 1, note)
  }

  function findById(id: string): Note | undefined {
    return notes.value.find((item) => item.id === id)
  }

  function remove(id: string) {
    const index = notes.value.findIndex((item) => item.id === id)
    if (index !== -1) {
      notes.value.splice(index, 1)
    }
  }

  function setPersistFailed(value: boolean) {
    persistFailed.value = value
  }

  return { notes, persistFailed, load, upsert, findById, remove, setPersistFailed }
})
