import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createHistory } from '~/composables/useEditHistory'
import type { Note } from '~/types/note'

const PAUSE_MS = 800

function makeNote(): Note {
  return {
    id: 'n1',
    title: 'Покупки',
    todos: [
      { id: 't1', text: 'молоко', done: false },
      { id: 't2', text: 'хлеб', done: false },
      { id: 't3', text: 'сыр', done: true },
    ],
    updatedAt: 1_700_000_000_000,
  }
}

function ids(note: Note): string[] {
  return note.todos.map((todo) => todo.id)
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('коалесцирование ввода', () => {
  it('непрерывный ввод дает одну команду, пауза начинает новую', () => {
    const history = createHistory()
    let note = makeNote()

    note = history.setTitle(note, 'П')
    note = history.setTitle(note, 'Пл')
    note = history.setTitle(note, 'План')
    vi.advanceTimersByTime(PAUSE_MS)
    note = history.setTitle(note, 'План ')
    note = history.setTitle(note, 'План Б')
    vi.advanceTimersByTime(PAUSE_MS)

    expect(note.title).toBe('План Б')

    note = history.undo(note)
    expect(note.title).toBe('План')

    note = history.undo(note)
    expect(note.title).toBe('Покупки')
    expect(history.canUndo()).toBe(false)
  })

  it('блюр закрывает фрагмент до паузы', () => {
    const history = createHistory()
    let note = makeNote()

    note = history.setTitle(note, 'Пл')
    note = history.setTitle(note, 'План')
    history.commitPending()
    note = history.setTitle(note, 'План Б')
    history.commitPending()

    note = history.undo(note)
    expect(note.title).toBe('План')

    note = history.undo(note)
    expect(note.title).toBe('Покупки')
    expect(history.canUndo()).toBe(false)
  })

  it('возврат к исходному значению не создает команду', () => {
    const history = createHistory()
    let note = makeNote()

    note = history.setTitle(note, 'Покупк')
    note = history.setTitle(note, 'Покупки')
    vi.advanceTimersByTime(PAUSE_MS)

    expect(history.canUndo()).toBe(false)
  })

  it('переход на другое поле закрывает прежний фрагмент', () => {
    const history = createHistory()
    let note = makeNote()

    note = history.setTitle(note, 'План')
    note = history.setTodoText(note, 't1', 'молоко 2%')
    vi.advanceTimersByTime(PAUSE_MS)

    note = history.undo(note)
    expect(note.todos[0].text).toBe('молоко')
    expect(note.title).toBe('План')

    note = history.undo(note)
    expect(note.title).toBe('Покупки')
  })
})

describe('порядок команд', () => {
  it('toggle закрывает набранный фрагмент и ложится после него', () => {
    const history = createHistory()
    let note = makeNote()

    note = history.setTitle(note, 'Пла')
    note = history.setTitle(note, 'План')
    note = history.toggleTodo(note, 't1')

    expect(note.title).toBe('План')
    expect(note.todos[0].done).toBe(true)

    note = history.undo(note)
    expect(note.todos[0].done).toBe(false)
    expect(note.title).toBe('План')

    note = history.undo(note)
    expect(note.title).toBe('Покупки')
    expect(history.canUndo()).toBe(false)
  })

  it('undo при незакрытом вводе откатывает весь фрагмент', () => {
    const history = createHistory()
    let note = makeNote()

    note = history.setTitle(note, 'П')
    note = history.setTitle(note, 'Пл')
    note = history.setTitle(note, 'План')

    note = history.undo(note)
    expect(note.title).toBe('Покупки')
    expect(history.canUndo()).toBe(false)

    note = history.redo(note)
    expect(note.title).toBe('План')
  })

  it('новая команда после undo стирает redo', () => {
    const history = createHistory()
    let note = makeNote()

    note = history.toggleTodo(note, 't1')
    note = history.undo(note)
    expect(history.canRedo()).toBe(true)

    note = history.toggleTodo(note, 't2')
    expect(history.canRedo()).toBe(false)

    const afterRedo = history.redo(note)
    expect(afterRedo).toBe(note)
  })
})

describe('лимит истории', () => {
  it('55 команд оставляют 50 шагов, redo доходит до конца', () => {
    const history = createHistory()
    let note = makeNote()
    const base = note.todos.length

    for (let i = 0; i < 55; i += 1) {
      note = history.addTodo(note, { id: `new-${i}`, text: `пункт ${i}`, done: false })
    }
    expect(note.todos).toHaveLength(base + 55)

    let undone = 0
    while (history.canUndo()) {
      note = history.undo(note)
      undone += 1
    }
    expect(undone).toBe(50)
    expect(note.todos).toHaveLength(base + 5)

    let redone = 0
    while (history.canRedo()) {
      note = history.redo(note)
      redone += 1
    }
    expect(redone).toBe(50)
    expect(note.todos).toHaveLength(base + 55)
  })
})

describe('атомарные команды', () => {
  it('toggle, add и remove откатываются на исходную позицию', () => {
    const history = createHistory()
    let note = makeNote()

    note = history.toggleTodo(note, 't3')
    expect(note.todos[2].done).toBe(false)
    note = history.undo(note)
    expect(note.todos[2].done).toBe(true)

    note = history.addTodo(note, { id: 't4', text: 'кофе', done: false })
    expect(ids(note)).toEqual(['t1', 't2', 't3', 't4'])
    note = history.undo(note)
    expect(ids(note)).toEqual(['t1', 't2', 't3'])

    note = history.removeTodo(note, 't2')
    expect(ids(note)).toEqual(['t1', 't3'])
    note = history.undo(note)
    expect(ids(note)).toEqual(['t1', 't2', 't3'])
    expect(note.todos[1].text).toBe('хлеб')
  })
})

describe('сброс истории', () => {
  it('reset чистит стеки, буфер и таймер паузы', () => {
    const history = createHistory()
    let note = makeNote()

    note = history.setTitle(note, 'Пла')
    note = history.toggleTodo(note, 't1')
    note = history.undo(note)

    history.reset()

    expect(history.canUndo()).toBe(false)
    expect(history.canRedo()).toBe(false)
    expect(history.undo(note)).toBe(note)
    expect(history.redo(note)).toBe(note)

    vi.advanceTimersByTime(PAUSE_MS)
    expect(history.canUndo()).toBe(false)
  })
})
