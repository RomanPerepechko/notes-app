import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useNotesStore } from '~/stores/notes'
import type { Note } from '~/types/note'

const DATA_KEY = 'notes-app:data'

function makeNote(id: string, title: string): Note {
  return { id, title, todos: [], updatedAt: 1_700_000_000_000 }
}

function seed(notes: Note[]) {
  localStorage.setItem(DATA_KEY, JSON.stringify({ version: 1, notes }))
}

beforeEach(() => {
  localStorage.clear()
  setActivePinia(createPinia())
})

describe('стор заметок', () => {
  it('load читает заметки из хранилища', () => {
    seed([makeNote('n1', 'Покупки'), makeNote('n2', 'Работа')])
    const store = useNotesStore()

    store.load()

    expect(store.notes.map((note) => note.id)).toEqual(['n1', 'n2'])
  })

  it('load на битых данных оставляет стор пустым', () => {
    localStorage.setItem(DATA_KEY, 'не json')
    const store = useNotesStore()

    store.load()

    expect(store.notes).toEqual([])
  })

  it('upsert вставляет новую в начало, существующую правит на месте', () => {
    const store = useNotesStore()

    store.upsert(makeNote('n1', 'Первая'))
    store.upsert(makeNote('n2', 'Вторая'))
    store.upsert({ ...makeNote('n1', 'Первая, переименована'), updatedAt: 1_700_000_001_000 })

    expect(store.notes.map((note) => note.title)).toEqual(['Вторая', 'Первая, переименована'])
  })

  it('remove удаляет по id и не падает на чужом id', () => {
    seed([makeNote('n1', 'Покупки'), makeNote('n2', 'Работа')])
    const store = useNotesStore()
    store.load()

    store.remove('n1')
    store.remove('unknown')

    expect(store.notes.map((note) => note.id)).toEqual(['n2'])
  })

  it('повторный load подхватывает данные другой вкладки', () => {
    seed([makeNote('n1', 'Покупки'), makeNote('n2', 'Работа')])
    const store = useNotesStore()
    store.load()

    seed([makeNote('n2', 'Работа, изменена'), makeNote('n3', 'Новая из другой вкладки')])
    store.load()

    expect(store.notes.map((note) => note.id)).toEqual(['n2', 'n3'])
    expect(store.notes.map((note) => note.title)).toEqual([
      'Работа, изменена',
      'Новая из другой вкладки',
    ])
  })
})
