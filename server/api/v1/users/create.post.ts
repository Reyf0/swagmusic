import * as z from 'zod'

const userSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6, 'Password must be at least 6 characters long'),
    username: z.string().min(3, 'Username must be at least 3 characters long')
})

export default defineEventHandler(async (event) => {
    await requireAdmin(event)

    const parsed = userSchema.safeParse(await readBody(event))
    if (!parsed.success) {
        throw createError({ statusCode: 400, statusMessage: 'Invalid request body', data: parsed.error.flatten() })
    }

    const { email, password, username } = parsed.data

    const { data, error } = await useSupabaseAdmin().auth.admin.createUser({
        email,
        password,
        user_metadata: { username },
        email_confirm: true
    })

    if (error) {
        throw createError({ statusCode: 400, statusMessage: error.message })
    }

    setResponseStatus(event, 201)
    return { user: data.user }
})
