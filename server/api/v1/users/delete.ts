import type { H3Event } from "h3";

export default defineEventHandler(async (event: H3Event) => {
    const body = await readBody(event)
    const { userId } = body

    if (!userId) return { error: 'Missing userId' }

    const { error } = await supabase.auth.admin.deleteUser(userId)

    if (error) return { error: error.message }

    return { success: true }
})
