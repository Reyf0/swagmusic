import { z } from 'zod'

const RawEnvSchema = z.object({
    SUPABASE_URL: z.string().url().optional(),
    SUPABASE_KEY: z.string().optional(),
    NUXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
    NUXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),
    NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),
    NODE_ENV: z.string().optional(),
}).superRefine((data, ctx) => {
    if (!data.SUPABASE_URL && !data.NUXT_PUBLIC_SUPABASE_URL && !data.NEXT_PUBLIC_SUPABASE_URL) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Missing SUPABASE_URL or NUXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL",
            path: ["SUPABASE_URL"],
        });
    }
    if (!data.SUPABASE_KEY && !data.NUXT_PUBLIC_SUPABASE_ANON_KEY && !data.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Missing SUPABASE_KEY or NUXT_PUBLIC_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY",
            path: ["SUPABASE_KEY"],
        });
    }
});

const parsed = RawEnvSchema.safeParse({
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_KEY: process.env.SUPABASE_KEY,
    NUXT_PUBLIC_SUPABASE_URL: process.env.NUXT_PUBLIC_SUPABASE_URL,
    NUXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NODE_ENV: process.env.NODE_ENV,
});

if (!parsed.success) {
    console.error("❌ Invalid env vars:", parsed.error.format())
    throw new Error(("Invalid or missing environment variables — see server logs."))
}

export const env = {
    supabaseUrl: parsed.data.SUPABASE_URL ?? parsed.data.NUXT_PUBLIC_SUPABASE_URL! ?? parsed.data.NEXT_PUBLIC_SUPABASE_URL,
    supabaseKey: parsed.data.SUPABASE_KEY ?? parsed.data.NUXT_PUBLIC_SUPABASE_ANON_KEY! ?? parsed.data.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    nodeEnv: parsed.data.NODE_ENV ?? "development",
} as const;

export type Env = typeof env;