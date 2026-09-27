import * as z from 'zod'

const schema = z.object({
    user_id: z.string().uuid(),
    email: z.string().email().optional(),
    password: z.string().min(6).optional(),
    username: z.string().trim().min(3).max(30).optional(),
    full_name: z.string().trim().max(120).nullable().optional(),
    is_admin: z.boolean().optional(),
})

/** Admin: update a user's auth attributes and profile fields. */
export default defineEventHandler(async (event) => {
    const admin = await requireAdmin(event)

    const parsed = schema.safeParse(await readBody(event))
    if (!parsed.success) {
        throw createError({ statusCode: 400, statusMessage: 'Invalid request body', data: parsed.error.flatten() })
    }

    const { user_id, email, password, username, full_name, is_admin } = parsed.data
    if (user_id === admin.id && is_admin === false) {
        throw createError({ statusCode: 400, statusMessage: 'You cannot remove your own admin rights' })
    }

    const supabase = useSupabaseAdmin()

    if (email || password || username) {
        const { error } = await supabase.auth.admin.updateUserById(user_id, {
            ...(email && { email }),
            ...(password && { password }),
            ...(username && { user_metadata: { username } }),
        })
        if (error) {
            throw createError({ statusCode: 400, statusMessage: error.message })
        }
    }

    const profilePatch = {
        ...(username !== undefined && { username }),
        ...(full_name !== undefined && { full_name }),
        ...(is_admin !== undefined && { is_admin }),
        ...(email !== undefined && { email }),
    }
    if (Object.keys(profilePatch).length) {
        const { error } = await supabase.from('profiles').update(profilePatch).eq('id', user_id)
        if (error) {
            throw createError({ statusCode: 400, statusMessage: error.message })
        }
    }

    return { success: true }
})
