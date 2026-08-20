import type { Note, TodoItem } from '~/types/note'

// История правок это стек команд, а не снимков: 50 шагов стоят 50 мелких
// записей вместо 50 копий заметки.
//
// Набор текста копится в pending буфере и становится командой по блюру, паузе
// 800 мс или любому другому действию, включая undo. Поэтому Ctrl+Z сразу после
// ввода коммитит фрагмент и тут же откатывает его целиком.
//
// nextValue в буфере, хотя в ТЗ его нет: коммит по таймеру заметку не видит.

type Command =
  | { type: 'set-title'; prev: string; next: string }
  | { type: 'set-todo-text'; todoId: string; prev: string; next: string }
  | { type: 'toggle-todo'; todoId: string; prev: boolean }
  | { type: 'add-todo'; todo: TodoItem; index: number }
  | { type: 'remove-todo'; todo: TodoItem; index: number }

interface PendingTitle {
  field: 'title'
  prevValue: string
  nextValue: string
}

interface PendingTodoText {
  field: 'todo-text'
  todoId: string
  prevValue: string
  nextValue: string
}

type Pending = PendingTitle | PendingTodoText

const LIMIT = 50
const PAUSE_MS = 800

function withTodo(todos: TodoItem[], todoId: string, patch: Partial<TodoItem>): TodoItem[] {
  return todos.map((item) => (item.id === todoId ? { ...item, ...patch } : item))
}

function withInserted(todos: TodoItem[], todo: TodoItem, index: number): TodoItem[] {
  const next = todos.slice()
  next.splice(index, 0, todo)
  return next
}

function withRemoved(todos: TodoItem[], index: number): TodoItem[] {
  const next = todos.slice()
  next.splice(index, 1)
  return next
}

function applyCommand(note: Note, command: Command): Note {
  switch (command.type) {
    case 'set-title':
      return { ...note, title: command.next }
    case 'set-todo-text':
      return { ...note, todos: withTodo(note.todos, command.todoId, { text: command.next }) }
    case 'toggle-todo':
      return { ...note, todos: withTodo(note.todos, command.todoId, { done: !command.prev }) }
    case 'add-todo':
      return { ...note, todos: withInserted(note.todos, command.todo, command.index) }
    case 'remove-todo':
      return { ...note, todos: withRemoved(note.todos, command.index) }
  }
}

function revertCommand(note: Note, command: Command): Note {
  switch (command.type) {
    case 'set-title':
      return { ...note, title: command.prev }
    case 'set-todo-text':
      return { ...note, todos: withTodo(note.todos, command.todoId, { text: command.prev }) }
    case 'toggle-todo':
      return { ...note, todos: withTodo(note.todos, command.todoId, { done: command.prev }) }
    case 'add-todo':
      return { ...note, todos: withRemoved(note.todos, command.index) }
    case 'remove-todo':
      return { ...note, todos: withInserted(note.todos, command.todo, command.index) }
  }
}

function pendingToCommand(pending: Pending): Command {
  if (pending.field === 'title') {
    return { type: 'set-title', prev: pending.prevValue, next: pending.nextValue }
  }
  return {
    type: 'set-todo-text',
    todoId: pending.todoId,
    prev: pending.prevValue,
    next: pending.nextValue,
  }
}

export function createHistory() {
  const undoStack: Command[] = []
  const redoStack: Command[] = []
  let pending: Pending | undefined
  let pauseTimer: ReturnType<typeof setTimeout> | undefined

  function stopPause() {
    if (pauseTimer !== undefined) {
      clearTimeout(pauseTimer)
      pauseTimer = undefined
    }
  }

  function restartPause() {
    stopPause()
    pauseTimer = setTimeout(commitPending, PAUSE_MS)
  }

  function push(command: Command) {
    undoStack.push(command)
    if (undoStack.length > LIMIT) {
      undoStack.shift()
    }
    redoStack.length = 0
  }

  function commitPending() {
    stopPause()
    if (pending === undefined) {
      return
    }
    const buffered = pending
    pending = undefined
    if (buffered.prevValue !== buffered.nextValue) {
      push(pendingToCommand(buffered))
    }
  }

  function hasPendingChange(): boolean {
    return pending !== undefined && pending.prevValue !== pending.nextValue
  }

  function setTitle(note: Note, value: string): Note {
    if (pending !== undefined && pending.field !== 'title') {
      commitPending()
    }
    if (pending === undefined) {
      pending = { field: 'title', prevValue: note.title, nextValue: value }
    } else {
      pending.nextValue = value
    }
    restartPause()
    return applyCommand(note, { type: 'set-title', prev: note.title, next: value })
  }

  function setTodoText(note: Note, todoId: string, value: string): Note {
    if (pending !== undefined && (pending.field !== 'todo-text' || pending.todoId !== todoId)) {
      commitPending()
    }
    const index = note.todos.findIndex((item) => item.id === todoId)
    if (index === -1) {
      return note
    }
    const prev = note.todos[index].text
    if (pending === undefined) {
      pending = { field: 'todo-text', todoId, prevValue: prev, nextValue: value }
    } else {
      pending.nextValue = value
    }
    restartPause()
    return applyCommand(note, { type: 'set-todo-text', todoId, prev, next: value })
  }

  function toggleTodo(note: Note, todoId: string): Note {
    commitPending()
    const index = note.todos.findIndex((item) => item.id === todoId)
    if (index === -1) {
      return note
    }
    const command: Command = { type: 'toggle-todo', todoId, prev: note.todos[index].done }
    push(command)
    return applyCommand(note, command)
  }

  function addTodo(note: Note, todo: TodoItem): Note {
    commitPending()
    const command: Command = { type: 'add-todo', todo, index: note.todos.length }
    push(command)
    return applyCommand(note, command)
  }

  function removeTodo(note: Note, todoId: string): Note {
    commitPending()
    const index = note.todos.findIndex((item) => item.id === todoId)
    if (index === -1) {
      return note
    }
    const command: Command = { type: 'remove-todo', todo: note.todos[index], index }
    push(command)
    return applyCommand(note, command)
  }

  function undo(note: Note): Note {
    commitPending()
    const command = undoStack.pop()
    if (command === undefined) {
      return note
    }
    redoStack.push(command)
    return revertCommand(note, command)
  }

  function redo(note: Note): Note {
    commitPending()
    const command = redoStack.pop()
    if (command === undefined) {
      return note
    }
    // мимо push: возврат команды в undo не должен чистить redo
    undoStack.push(command)
    return applyCommand(note, command)
  }

  function reset() {
    stopPause()
    pending = undefined
    undoStack.length = 0
    redoStack.length = 0
  }

  function canUndo(): boolean {
    return undoStack.length > 0 || hasPendingChange()
  }

  function canRedo(): boolean {
    // незакрытый фрагмент на коммите сотрет redo, поэтому кнопку не обещаем
    return redoStack.length > 0 && !hasPendingChange()
  }

  return {
    setTitle,
    setTodoText,
    toggleTodo,
    addTodo,
    removeTodo,
    commitPending,
    undo,
    redo,
    reset,
    canUndo,
    canRedo,
  }
}
