import type { Note, TodoItem } from '~/types/note'

// В localStorage лежит не голый массив заметок, а обертка с версией схемы
// без нее после первого же изменения формы Note старые данные не отличить
// от битых. Читаем только через migrate(), будущие миграции встанут туда же.
// Мусор и чужие версии дают пустое состояние, а не исключение.
export interface PersistedState {
  version: 1
  notes: Note[]
}

// Черновик редактора живет отдельным ключом со своей оберткой: он короче
// данных по времени жизни, и при непонятной форме его молча выбрасывают,
// а не пытаются восстановить.
export interface PersistedDraft {
  version: 1
  noteId: string
  note: Note
  savedAt: number
}

export const DATA_KEY = 'notes-app:data'
const DRAFT_KEY = 'notes-app:draft'
const SCHEMA_VERSION = 1

// экран создания заметки один, а id новой заметки в каждом заходе свой, поэтому
// его черновик адресуется не идентификатором
export const NEW_NOTE_DRAFT_ID = 'new'

function emptyState(): PersistedState {
  return { version: SCHEMA_VERSION, notes: [] }
}

function isTodoItem(value: unknown): value is TodoItem {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    typeof value.id === 'string' &&
    'text' in value &&
    typeof value.text === 'string' &&
    'done' in value &&
    typeof value.done === 'boolean'
  )
}

function isNote(value: unknown): value is Note {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    typeof value.id === 'string' &&
    'title' in value &&
    typeof value.title === 'string' &&
    'updatedAt' in value &&
    typeof value.updatedAt === 'number' &&
    'todos' in value &&
    Array.isArray(value.todos) &&
    value.todos.every((item: unknown) => isTodoItem(item))
  )
}

export function migrate(raw: unknown): PersistedState {
  if (
    typeof raw !== 'object' ||
    raw === null ||
    !('version' in raw) ||
    raw.version !== SCHEMA_VERSION ||
    !('notes' in raw) ||
    !Array.isArray(raw.notes)
  ) {
    return emptyState()
  }

  const notes = raw.notes.filter((item: unknown): item is Note => isNote(item))
  // хоть одна битая заметка, выкидываем весь набор, частично не склеиваем
  if (notes.length !== raw.notes.length) {
    return emptyState()
  }

  return { version: SCHEMA_VERSION, notes }
}

export function readState(): PersistedState {
  let raw: unknown
  try {
    const text = localStorage.getItem(DATA_KEY)
    if (text === null) {
      return emptyState()
    }
    raw = JSON.parse(text)
  } catch {
    return emptyState()
  }

  return migrate(raw)
}

export function writeState(notes: Note[]): boolean {
  const state: PersistedState = { version: SCHEMA_VERSION, notes }
  try {
    localStorage.setItem(DATA_KEY, JSON.stringify(state))
    return true
  } catch {
    return false
  }
}

function isPersistedDraft(value: unknown): value is PersistedDraft {
  return (
    typeof value === 'object' &&
    value !== null &&
    'version' in value &&
    value.version === SCHEMA_VERSION &&
    'noteId' in value &&
    typeof value.noteId === 'string' &&
    'savedAt' in value &&
    typeof value.savedAt === 'number' &&
    'note' in value &&
    isNote(value.note)
  )
}

export function readDraft(): PersistedDraft | undefined {
  try {
    const text = localStorage.getItem(DRAFT_KEY)
    if (text === null) {
      return undefined
    }
    const raw: unknown = JSON.parse(text)
    return isPersistedDraft(raw) ? raw : undefined
  } catch {
    return undefined
  }
}

export function writeDraft(noteId: string, note: Note): boolean {
  const draft: PersistedDraft = { version: SCHEMA_VERSION, noteId, note, savedAt: Date.now() }
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
    return true
  } catch {
    return false
  }
}

export function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY)
  } catch {
    // приватный режим умеет запрещать и удаление, ронять на этом редактор незачем
  }
}
