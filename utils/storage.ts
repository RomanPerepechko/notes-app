import type { Note, TodoItem } from '~/types/note'

// В localStorage лежит не голый массив заметок, а обертка с версией схемы
// без нее после первого же изменения формы Note старые данные не отличить
// от битых. Читаем только через migrate(), будущие миграции встанут туда же.
// Мусор и чужие версии дают пустое состояние, а не исключение.
export interface PersistedState {
  version: 1
  notes: Note[]
}

const DATA_KEY = 'notes-app:data'
const SCHEMA_VERSION = 1

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
