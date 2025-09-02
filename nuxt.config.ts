// https://nuxt.com/docs/api/configuration/nuxt-config

import "./lib/env";

export default defineNuxtConfig({
  compatibilityDate: '2025-05-15',

  devtools: {
    enabled: true,

    timeline: {
      enabled: true
    }
  },

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
    '@pinia/nuxt',
    'nuxt-auth-utils',
    '@sentry/nuxt/module'
  ],

  runtimeConfig: {
    sentryDsn: process.env.SENTRY_DSN,

    public: {
      errorLoggerEndpoint: process.env.ERROR_ENDPOINT || '/api/v1/error'
    }
  },

  css: ['~/assets/css/main.css'],

  ui: {
    colorMode: true,
    theme: {
      colors: ['primary', 'secondary', 'success', 'warning', 'error', 'info']
    },
    icons: ['heroicons'],
    locale: {
      default: 'en',
      fallback: 'en'
    }
  },

  colorMode: {
    preference: 'light'
  },

  icon: {
    cssLayer: 'icon',
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
  },

  sentry: {
    sourceMapsUploadOptions: {
      org: 'reyf-org',
      project: 'javascript-nuxt'
    },

    autoInjectServerSentry: 'top-level-import'
  },

  sourcemap: {
    client: 'hidden'
  }
})