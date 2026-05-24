// https://nuxt.com/docs/api/configuration/nuxt-config



export default defineNuxtConfig({
    compatibilityDate: '2025-05-15',

    devtools: {
        enabled: true,

        timeline: {
            enabled: true
        }
    },

    devServer: {
        host: '0.0.0.0',
        port: 3000
    },

    plugins: [
        '~/plugins/supabase.ts',
        '~/plugins/supabase-auth.client.ts'
    ],

    modules: [
      '@nuxt/content',
      '@nuxt/eslint',
      '@nuxt/fonts',
      '@nuxt/icon',
      '@nuxt/image',
      '@nuxt/test-utils',
      '@nuxt/ui',
      '@nuxtjs/tailwindcss',
      '@pinia/nuxt',
      'nuxt-auth-utils',
      '@sentry/nuxt/module',
      '@vueuse/motion/nuxt',
      'hero-motion/nuxt',
      '@nuxtjs/robots',
      '@nuxtjs/seo',
      '@nuxt/hints'
    ],

    runtimeConfig: {
        sentryDsn: process.env.SENTRY_DSN,

        supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_API_SECRET_KEY,
        supabaseUrl: process.env.SUPABASE_URL,
        supabaseKey: process.env.SUPABASE_KEY || process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY,


        public: {
            errorLoggerEndpoint: process.env.ERROR_ENDPOINT || '/api/v1/error',
            supabaseUrl: process.env.NUXT_PUBLIC_SUPABASE_URL,
            supabaseKey: process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY,
        },
        supabase: {
            serviceKey:
                process.env.SUPABASE_SERVICE_ROLE_KEY ||
                process.env.NUXT_SUPABASE_SECRET_KEY,
        }
    },
    routeRules: {
        '/': {
            prerender: true
        },
        '/admin/**': {
          ssr: false
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

    icon: {
        cssLayer: 'icon',
    },

    app: {
        head: {
            title: 'SwagMusic',
            htmlAttrs: {
                lang: 'en',
            },
        }
    },

    imports: {
        dirs: ['./stores', './composables', './types']
    },

    supabase: {
        redirect: false,

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