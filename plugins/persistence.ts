const WRITE_DEBOUNCE_MS = 500

export default defineNuxtPlugin(() => {
  const store = useNotesStore()
  store.load()

  let timer: ReturnType<typeof setTimeout> | undefined
  // правку, пришедшую из другой вкладки, нельзя писать обратно: вкладки начали
  // бы гонять один и тот же набор через общий ключ по кругу
  let applyingExternal = false

  function write() {
    timer = undefined
    if (!writeState(store.notes)) {
      store.setPersistFailed(true)
    }
  }

  function flushPending() {
    if (timer === undefined) {
      return
    }
    clearTimeout(timer)
    write()
  }

  // flush: 'sync' иначе правка перед самым закрытием вкладки теряется:
  // beforeunload успевает раньше, чем сработает отложенный колбэк вотчера
  watch(
    () => store.notes,
    () => {
      if (applyingExternal) {
        return
      }
      if (timer !== undefined) {
        clearTimeout(timer)
      }
      timer = setTimeout(write, WRITE_DEBOUNCE_MS)
    },
    { deep: true, flush: 'sync' },
  )

  window.addEventListener('storage', (event: StorageEvent) => {
    if (event.key !== DATA_KEY) {
      return
    }
    applyingExternal = true
    store.load()
    applyingExternal = false
  })

  window.addEventListener('beforeunload', flushPending)
})
