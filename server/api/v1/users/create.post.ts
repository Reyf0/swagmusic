import * as z from 'zod'

const userSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6, 'Password must be at least 6 characters long'),
    username: z.string().trim().min(3, 'Username must be at least 3 characters long').max(30),
    full_name: z.string().trim().max(120).optional(),
    is_admin: z.boolean().optional(),
})

/** Admin: create a confirmed user and its profile. */
export default defineEventHandler(async (event) => {
    await requireAdmin(event)

    const parsed = userSchema.safeParse(await readBody(event))
    if (!parsed.success) {
        throw createError({ statusCode: 400, statusMessage: 'Invalid request body', data: parsed.error.flatten() })
    }

    const { email, password, username, full_name, is_admin } = parsed.data
    const supabase = useSupabaseAdmin()

    const { data, error } = await supabase.auth.admin.createUser({
        email,
        password,
        user_metadata: { username },
        email_confirm: true
    })
    if (error) {
        throw createError({ statusCode: 400, statusMessage: error.message })
    }

    // A signup trigger may already have created the profile; upsert fills in the rest.
    const { error: profileError } = await supabase.from('profiles').upsert({
        id: data.user.id,
        email,
        username,
        full_name: full_name || null,
        is_admin: is_admin ?? false,
    })
    if (profileError) {
        throw createError({ statusCode: 500, statusMessage: `User created, but the profile could not be saved: ${profileError.message}` })
    }

    // Not setResponseStatus(): its auto-import type clashes with Nuxt's app composable of the same name.
    event.node.res.statusCode = 201
    return { user: data.user }
})
