// https://nuxt.com/docs/api/configuration/nuxt-config

const env = process.env

const supabaseUrl = env.NUXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL
const supabaseHost = supabaseUrl ? new URL(supabaseUrl).host : undefined
// Error reporting is only bundled when a DSN is configured (it adds ~50 KB gzipped to every page).
const sentryDsn = env.NUXT_PUBLIC_SENTRY_DSN || env.SENTRY_DSN || ''

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
        ...(sentryDsn ? ['@sentry/nuxt/module'] : []),
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
            supabaseUrl,
            supabaseKey: env.NUXT_PUBLIC_SUPABASE_KEY || env.SUPABASE_PUBLISHABLE_KEY || env.NUXT_PUBLIC_SUPABASE_ANON_KEY || env.SUPABASE_KEY || env.SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
            sentryDsn
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

    nitro: {
        vercel: {
            // Run server rendering next to the database (Supabase eu-north-1, Stockholm), not in the
            // default US East region: each page render makes several database round trips.
            functions: { regions: ['arn1'] },
        },
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

    // Covers and avatars are resized / re-encoded by the host's image optimizer (Vercel in production,
    // IPX locally). Vercel only serves widths listed in `screens`: <CoverImage> sizes plus their 2x.
    image: {
        domains: supabaseHost ? [supabaseHost] : [],
        screens: {
            thumb: 48, thumb2x: 96, card: 160,
            xs: 320, sm: 640, md: 768, lg: 1024, xl: 1280, xxl: 1536,
        },
        vercel: {
            // Uploads get unique file names (avatars a ?t= version), so cached results never go stale.
            minimumCacheTTL: 60 * 60 * 24 * 30,
        },
    },

    app: {
        head: {
            title: 'SwagMusic',
            htmlAttrs: {
                lang: 'en'
            },
            // Google Search Console ownership (also public/google044e33024324b981.html). Keep both.
            meta: [
                { name: 'google-site-verification', content: 'W-8t5A63Xg6vR_oBuHKbh3eiKu2TH9O5WAokXSIq8SU' }
            ]
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

    // Hidden source maps are uploaded to Sentry by its module.
    ...(sentryDsn ? {
        sentry: {
            sourceMapsUploadOptions: {
                org: 'reyf-org',
                project: 'javascript-nuxt'
            },
            autoInjectServerSentry: 'top-level-import' as const
        },
        sourcemap: {
            client: 'hidden' as const
        }
    } : {}),
})
