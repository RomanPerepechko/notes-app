export default defineNuxtConfig({
  ssr: false,
  modules: ['@pinia/nuxt'],
  typescript: {
    strict: true,
  },
  css: ['~/assets/styles/main.scss'],
  vite: {
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: '@use "~/assets/styles/variables" as *;',
        },
      },
    },
  },
})
