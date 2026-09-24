import { z } from 'zod'

export const profileCreateSchema = z.object({
    id: z.string().uuid().optional(), // auto-generated if not provided
    username: z.string().min(1).max(30).regex(/^[a-zA-Z0-9._-]+$/),
    full_name: z.string().max(120).optional(),
    avatar_url: z.string().url().optional(),
    website: z.string().url().optional()
})

export const profileUpdateSchema = profileCreateSchema.partial()

export type ProfileCreateInput = z.infer<typeof profileCreateSchema>
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>