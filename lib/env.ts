import { z } from 'zod'

const EnvSchema = z.object({
    SUPABASE_URL: z.string(),
    SUPABASE_KEY: z.string()
})

export type EnvSchema = z.infer<typeof EnvSchema>;

export default EnvSchema.parse(process.env)