export default defineNuxtConfig({
  ssr: false,
  typescript: {
    strict: true,
  },
  css: ['~/assets/styles/main.scss'],
  vite: {
    css: {
      preprocessorOptions: {
        scss: {
          // переменные нужны почти в каждом scoped-блоке, инжектим их один раз
          additionalData: '@use "~/assets/styles/variables" as *;',
        },
      },
    },
  },
})
