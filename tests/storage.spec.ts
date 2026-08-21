import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Note } from '~/types/note'
import {
  clearDraft,
  migrate,
  readDraft,
  readState,
  writeDraft,
  writeState,
} from '~/utils/storage'

const DATA_KEY = 'notes-app:data'
const DRAFT_KEY = 'notes-app:draft'

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

describe('черновик', () => {
  it('записанный черновик читается обратно вместе с адресом', () => {
    const note = makeNote()

    expect(writeDraft('n1', note)).toBe(true)

    const draft = readDraft()
    expect(draft?.noteId).toBe('n1')
    expect(draft?.note).toEqual(note)
    expect(typeof draft?.savedAt).toBe('number')
  })

  it('черновик экрана создания адресуется не идентификатором', () => {
    writeDraft('new', makeNote())

    expect(readDraft()?.noteId).toBe('new')
  })

  it('пустое хранилище черновика не дает', () => {
    expect(readDraft()).toBeUndefined()
  })

  it('мусор и чужая версия дают отсутствие черновика, а не исключение', () => {
    const garbage: unknown[] = [
      42,
      'draft',
      {},
      { version: 1, noteId: 'n1' },
      { version: 2, noteId: 'n1', note: makeNote(), savedAt: 1 },
      { version: 1, noteId: 1, note: makeNote(), savedAt: 1 },
      { version: 1, noteId: 'n1', note: { id: 'n1' }, savedAt: 1 },
      { version: 1, noteId: 'n1', note: makeNote(), savedAt: 'вчера' },
    ]

    for (const raw of garbage) {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(raw))
      expect(readDraft()).toBeUndefined()
    }
  })

  it('битый JSON черновика не роняет чтение', () => {
    localStorage.setItem(DRAFT_KEY, '{"version":1,"noteId":')

    expect(readDraft()).toBeUndefined()
  })

  it('clearDraft убирает черновик, данные не трогает', () => {
    writeState([makeNote()])
    writeDraft('n1', makeNote())

    clearDraft()

    expect(readDraft()).toBeUndefined()
    expect(readState().notes).toHaveLength(1)
  })

  it('недоступная запись черновика отдает false и не бросает', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })

    expect(writeDraft('n1', makeNote())).toBe(false)
  })
})
