import { computed, onBeforeUnmount, ref } from 'vue'
import { useRouter } from 'vue-router'
import { createHistory } from '~/composables/useEditHistory'
import { useNotesStore } from '~/stores/notes'
import type { Note, TodoItem } from '~/types/note'

function cloneNote(note: Note): Note {
  return { ...note, todos: note.todos.map((todo) => ({ ...todo })) }
}

export function useNoteEditor(note: Note) {
  const notesStore = useNotesStore()
  const router = useRouter()
  const history = createHistory()

  const draft = ref<Note>(cloneNote(note))
  const canUndo = ref(false)
  const canRedo = ref(false)
  const canDelete = computed(() => notesStore.findById(draft.value.id) !== undefined)

  function refreshFlags() {
    canUndo.value = history.canUndo()
    canRedo.value = history.canRedo()
  }

  function setTitle(value: string) {
    draft.value = history.setTitle(draft.value, value)
    refreshFlags()
  }

  function setTodoText(todoId: string, value: string) {
    draft.value = history.setTodoText(draft.value, todoId, value)
    refreshFlags()
  }

  function commitText() {
    history.commitPending()
    refreshFlags()
  }

  function toggleTodo(todoId: string) {
    draft.value = history.toggleTodo(draft.value, todoId)
    refreshFlags()
  }

  function addTodo() {
    const todo: TodoItem = { id: crypto.randomUUID(), text: '', done: false }
    draft.value = history.addTodo(draft.value, todo)
    refreshFlags()
  }

  function removeTodo(todoId: string) {
    draft.value = history.removeTodo(draft.value, todoId)
    refreshFlags()
  }

  function undo() {
    draft.value = history.undo(draft.value)
    refreshFlags()
  }

  function redo() {
    draft.value = history.redo(draft.value)
    refreshFlags()
  }

  function save() {
    history.reset()
    notesStore.upsert({ ...cloneNote(draft.value), updatedAt: Date.now() })
    router.push('/')
  }

  function cancel() {
    history.reset()
    router.push('/')
  }

  async function remove() {
    history.reset()
    const id = draft.value.id
    // уходим со страницы раньше удаления, иначе на кадр мелькнет "заметка не найдена"
    await router.push('/')
    notesStore.remove(id)
  }

  // уходя со страницы, гасим таймер незакрытого фрагмента
  onBeforeUnmount(history.reset)

  return {
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
  }
}
