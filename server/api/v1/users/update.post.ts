import * as z from 'zod'

const schema = z.object({
    user_id: z.string().uuid(),
    email: z.string().email().optional(),
    password: z.string().min(6).optional(),
    username: z.string().min(3).optional()
})

export default defineEventHandler(async (event) => {
    await requireAdmin(event)

    const parsed = schema.safeParse(await readBody(event))
    if (!parsed.success) {
        throw createError({ statusCode: 400, statusMessage: 'Invalid request body', data: parsed.error.flatten() })
    }

    const { user_id, email, password, username } = parsed.data

    const { data, error } = await useSupabaseAdmin().auth.admin.updateUserById(user_id, {
        ...(email && { email }),
        ...(password && { password }),
        ...(username && { user_metadata: { username } })
    })

    if (error) {
        throw createError({ statusCode: 400, statusMessage: error.message })
    }

    return { user: data.user }
})
