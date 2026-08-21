import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { createHistory } from '~/composables/useEditHistory'
import { useNotesStore } from '~/stores/notes'
import type { Note, TodoItem } from '~/types/note'
import { NEW_NOTE_DRAFT_ID, clearDraft, readDraft, writeDraft } from '~/utils/storage'

const DRAFT_DEBOUNCE_MS = 1000
const FALLBACK_TITLE = 'Без названия'

function cloneNote(note: Note): Note {
  return { ...note, todos: note.todos.map((todo) => ({ ...todo })) }
}

function prepareForSave(note: Note): Note {
  const title = note.title.trim()
  return {
    id: note.id,
    title: title === '' ? FALLBACK_TITLE : title,
    todos: note.todos
      .filter((todo) => todo.text.trim() !== '')
      .map((todo) => ({ ...todo, text: todo.text.trim() })),
    updatedAt: Date.now(),
  }
}

function hasSameContent(one: Note, other: Note): boolean {
  if (one.title !== other.title || one.todos.length !== other.todos.length) {
    return false
  }
  return one.todos.every((todo, index) => {
    const counterpart = other.todos[index]
    return (
      todo.id === counterpart.id &&
      todo.text === counterpart.text &&
      todo.done === counterpart.done
    )
  })
}

export function useNoteEditor(note: Note) {
  const notesStore = useNotesStore()
  const router = useRouter()
  const history = createHistory()

  const isNew = notesStore.findById(note.id) === undefined
  const draftTarget = isNew ? NEW_NOTE_DRAFT_ID : note.id

  const initial = cloneNote(note)
  const draft = ref<Note>(cloneNote(note))
  const canUndo = ref(false)
  const canRedo = ref(false)
  const deletedElsewhere = ref(false)

  const stored = readDraft()
  const restorable = ref<Note | undefined>(
    stored !== undefined && stored.noteId === draftTarget && !hasSameContent(stored.note, initial)
      ? stored.note
      : undefined,
  )

  const canDelete = !isNew

  const isDirty = computed(() => !hasSameContent(draft.value, initial))

  let draftTimer: ReturnType<typeof setTimeout> | undefined

  function stopDraftTimer() {
    if (draftTimer !== undefined) {
      clearTimeout(draftTimer)
      draftTimer = undefined
    }
  }

  watch(draft, () => {
    stopDraftTimer()
    draftTimer = setTimeout(() => {
      draftTimer = undefined
      if (!writeDraft(draftTarget, draft.value)) {
        notesStore.setPersistFailed(true)
      }
    }, DRAFT_DEBOUNCE_MS)
  })

  const stopDeletionWatch = watch(
    () => notesStore.findById(note.id),
    (found) => {
      if (found !== undefined) {
        return
      }
      stopDraftTimer()
      clearDraft()
      deletedElsewhere.value = true
    },
  )

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

  function restoreDraft() {
    const found = restorable.value
    if (found === undefined) {
      return
    }

    draft.value = cloneNote(found)
    restorable.value = undefined
  }

  function discardDraft() {
    clearDraft()
    restorable.value = undefined
  }

  function save() {
    stopDraftTimer()
    history.reset()
    notesStore.upsert(prepareForSave(draft.value))
    clearDraft()
    router.push('/')
  }

  function cancel() {
    stopDraftTimer()
    history.reset()
    clearDraft()
    router.push('/')
  }

  async function remove() {
    stopDeletionWatch()
    stopDraftTimer()
    history.reset()
    clearDraft()
    const id = draft.value.id
    // уходим со страницы раньше удаления, иначе на кадр мелькнет "заметка не найдена"
    await router.push('/')
    notesStore.remove(id)
  }

  onBeforeUnmount(() => {
    history.reset()
    stopDraftTimer()
  })

  return {
    draft,
    canUndo,
    canRedo,
    canDelete,
    isDirty,
    restorable,
    deletedElsewhere,
    setTitle,
    setTodoText,
    commitText,
    toggleTodo,
    addTodo,
    removeTodo,
    undo,
    redo,
    restoreDraft,
    discardDraft,
    save,
    cancel,
    remove,
  }
}
