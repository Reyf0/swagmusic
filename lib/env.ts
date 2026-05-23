import { z } from 'zod'

const RawEnvSchema = z.object({
    SUPABASE_URL: z.string().url(),

    SUPABASE_SERVICE_ROLE_KEY: z.string(),

    NUXT_PUBLIC_SUPABASE_URL: z.string().url(),

    NUXT_PUBLIC_SUPABASE_ANON_KEY: z.string(),

    NODE_ENV: z.string().optional(),
})

const parsed = RawEnvSchema.parse({
    SUPABASE_URL: process.env.SUPABASE_URL,

    SUPABASE_SERVICE_ROLE_KEY:
    process.env.SUPABASE_SERVICE_ROLE_KEY,

    NUXT_PUBLIC_SUPABASE_URL:
    process.env.NUXT_PUBLIC_SUPABASE_URL,

    NUXT_PUBLIC_SUPABASE_ANON_KEY:
    process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY,

    NODE_ENV: process.env.NODE_ENV,
});

export const env = {
    supabase: {
        url: parsed.SUPABASE_URL || parsed.NUXT_PUBLIC_SUPABASE_URL,

        serviceRoleKey:
        parsed.SUPABASE_SERVICE_ROLE_KEY,

        anonKey:
        parsed.NUXT_PUBLIC_SUPABASE_ANON_KEY,
    },

    nodeEnv: parsed.NODE_ENV ?? 'development',
} as const

export type Env = typeof env;