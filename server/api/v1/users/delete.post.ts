import * as z from 'zod'

const schema = z.object({
    userId: z.string().uuid()
})

export default defineEventHandler(async (event) => {
    const admin = await requireAdmin(event)

    const parsed = schema.safeParse(await readBody(event))
    if (!parsed.success) {
        throw createError({ statusCode: 400, statusMessage: 'Invalid request body', data: parsed.error.flatten() })
    }

    const { userId } = parsed.data
    if (userId === admin.id) {
        throw createError({ statusCode: 400, statusMessage: 'You cannot delete your own account here' })
    }

    const { error } = await useSupabaseAdmin().auth.admin.deleteUser(userId)
    if (error) {
        throw createError({ statusCode: 400, statusMessage: error.message })
    }

    return { success: true }
})
