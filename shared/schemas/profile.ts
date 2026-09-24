import { z } from 'zod'

/** Letters (any script), digits, spaces, dots, dashes and underscores; 3–30 characters. */
export const USERNAME_PATTERN = /^[\p{L}\p{N} ._-]{3,30}$/u

export const profileUpdateSchema = z.object({
    username: z.string().trim().regex(USERNAME_PATTERN, 'Username must be 3–30 characters: letters, digits, spaces, dots, dashes or underscores'),
    full_name: z.string().trim().max(120).nullable(),
    avatar_url: z.string().url().nullable(),
    website: z.string().trim().url('Website must be a full URL, e.g. https://example.com').max(200).nullable(),
}).partial()

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>
