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
  typescript: {
    typeCheck: false
  },
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
  app: {
    head: {
      title: 'SwagMusic',
      htmlAttrs: {
        lang: 'en',
      }
    }
  },
  imports: {
    dirs: ['./stores', './composables', './types']
  },
  supabase: {
    redirect: false,
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_KEY,
  }
})