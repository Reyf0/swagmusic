// https://nuxt.com/docs/api/configuration/nuxt-config

const env = process.env

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

    modules: [
        '@nuxt/eslint',
        '@nuxt/fonts',
        '@nuxt/icon',
        '@nuxt/image',
        '@nuxt/test-utils/module',
        '@nuxt/ui',
        '@pinia/nuxt',
        '@sentry/nuxt/module',
        '@nuxtjs/seo',
        '@nuxt/hints',
        '@vercel/analytics/nuxt'
    ],

    // Canonical names: NUXT_PUBLIC_SUPABASE_URL, NUXT_PUBLIC_SUPABASE_KEY (publishable key,
    // sb_publishable_…) and SUPABASE_SECRET_KEY (sb_secret_…). The rest are fallbacks for names
    // used by older .env files / the Vercel integration (legacy anon / service_role JWTs).
    runtimeConfig: {
        supabaseSecretKey: env.SUPABASE_SECRET_KEY || env.SUPABASE_API_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY,

        public: {
            supabaseUrl: env.NUXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL,
            supabaseKey: env.NUXT_PUBLIC_SUPABASE_KEY || env.SUPABASE_PUBLISHABLE_KEY || env.NUXT_PUBLIC_SUPABASE_ANON_KEY || env.SUPABASE_KEY || env.SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
            sentryDsn: env.NUXT_PUBLIC_SENTRY_DSN || env.SENTRY_DSN || ''
        }
    },

    // Personal, auth and admin pages: not indexed and left out of the sitemap.
    routeRules: {
        '/admin/**': { ssr: false, robots: false },
        '/library': { robots: false },
        '/profile': { robots: false },
        '/settings': { robots: false },
        '/studio': { robots: false },
        '/upload': { robots: false },
        '/login': { robots: false },
        '/register': { robots: false },
        '/confirm': { robots: false },
        '/reset-password': { robots: false },
        // Search result pages are thin duplicates of the content pages.
        '/search': { robots: 'noindex, follow' },
    },

    css: ['~/assets/css/main.css'],

    ui: {
        colorMode: true,
        theme: {
            colors: ['primary', 'secondary', 'success', 'warning', 'error', 'info']
        }
    },

    icon: {
        cssLayer: 'icon'
    },

    app: {
        head: {
            title: 'SwagMusic',
            htmlAttrs: {
                lang: 'en'
            }
        }
    },

    site: {
        url: env.NUXT_SITE_URL,
        name: 'SwagMusic',
        description: 'Listen to new tracks, upload your own music and build playlists.',
        defaultLocale: 'en'
    },

    // Tracks, albums, playlists and artists come from the database (server/api/__sitemap__/urls.ts).
    sitemap: {
        sources: ['/api/__sitemap__/urls'],
    },

    // Link preview images (app/components/OgImage). Track / album titles are often Cyrillic.
    ogImage: {
        fontSubsets: ['latin', 'cyrillic'],
    },

    imports: {
        dirs: ['stores']
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
