// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-05-15',
  devtools: { enabled: true },

  modules: [
    '@nuxt/content',
    '@nuxt/eslint',
    '@nuxt/fonts',
    '@nuxt/icon',
    '@nuxt/image',
    '@nuxt/scripts',
    '@nuxt/test-utils',
    '@nuxt/ui',
    '@nuxtjs/supabase',
    '@nuxtjs/tailwindcss',
    '@pinia/nuxt'
  ],
  css: ['~/assets/css/main.css'],
  ui: {
    colorMode: false,
    theme: {
      colors: ['primary', 'error']
    },
    icons: ['heroicons'],
    locale: {
      default: 'en',
      fallback: 'en'
    }
  },

  supabase: {
    redirect: false,
    url: 'https://ofdlecccivsirfsaghac.supabase.co',
    key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9mZGxlY2NjaXZzaXJmc2FnaGFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkyMTI4MzAsImV4cCI6MjA2NDc4ODgzMH0.Z4BtazZgccVyssHiJhir8gdug92ZgpukeHVtJ22OECs'
  }
})
