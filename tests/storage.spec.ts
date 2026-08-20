import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Note } from '~/types/note'
import { migrate, readState, writeState } from '~/utils/storage'

const DATA_KEY = 'notes-app:data'

function makeNote(): Note {
  return {
    id: 'n1',
    title: 'Покупки',
    todos: [
      { id: 't1', text: 'молоко', done: false },
      { id: 't2', text: 'хлеб', done: true },
    ],
    updatedAt: 1_700_000_000_000,
  }
}

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('migrate', () => {
  it('валидные данные проходят как есть', () => {
    const notes = [makeNote()]

    expect(migrate({ version: 1, notes })).toEqual({ version: 1, notes })
  })

  it('пустой список заметок тоже валидное состояние', () => {
    expect(migrate({ version: 1, notes: [] })).toEqual({ version: 1, notes: [] })
  })

  it('мусор вместо данных не роняет, отдает пустое состояние', () => {
    const garbage: unknown[] = [
      null,
      undefined,
      42,
      'notes',
      [],
      {},
      { notes: [] },
      { version: 1 },
      { version: 1, notes: 'not-an-array' },
    ]

    for (const raw of garbage) {
      expect(migrate(raw)).toEqual({ version: 1, notes: [] })
    }
  })

  it('чужая версия схемы дает пустое состояние', () => {
    expect(migrate({ version: 2, notes: [makeNote()] })).toEqual({ version: 1, notes: [] })
    expect(migrate({ version: '1', notes: [makeNote()] })).toEqual({ version: 1, notes: [] })
  })

  it('заметка с неверными полями дает пустое состояние', () => {
    const broken: unknown[] = [
      { id: 'n1', title: 'x', todos: [], updatedAt: '2024' },
      { id: 'n1', title: 'x', todos: null, updatedAt: 1 },
      { id: 'n1', todos: [], updatedAt: 1 },
      { id: 'n1', title: 'x', todos: [{ id: 't1', text: 'a', done: 'yes' }], updatedAt: 1 },
    ]

    for (const note of broken) {
      expect(migrate({ version: 1, notes: [note] })).toEqual({ version: 1, notes: [] })
    }
  })

  it('если валидна только часть заметок, выкидывает все', () => {
    const raw = { version: 1, notes: [makeNote(), { id: 'n2' }] }

    expect(migrate(raw)).toEqual({ version: 1, notes: [] })
  })
})

describe('readState / writeState', () => {
  it('записанные заметки читаются обратно', () => {
    const notes = [makeNote()]

    expect(writeState(notes)).toBe(true)
    expect(readState()).toEqual({ version: 1, notes })
  })

  it('пустое хранилище дает пустое состояние', () => {
    expect(readState()).toEqual({ version: 1, notes: [] })
  })

  it('битый JSON не роняет чтение', () => {
    localStorage.setItem(DATA_KEY, '{"version":1,"notes":[')

    expect(readState()).toEqual({ version: 1, notes: [] })
  })

  it('недоступная запись отдает false и не бросает', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })

    expect(writeState([makeNote()])).toBe(false)
  })

  it('недоступное чтение дает пустое состояние', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError')
    })

    expect(readState()).toEqual({ version: 1, notes: [] })
  })
})
