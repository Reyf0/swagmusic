export default defineEventHandler(async (event) => {
    const body = await readBody(event)
    const { userId } = body

    if (!userId) return { error: 'Missing userId' }

    const { error } = await supabase.auth.admin.deleteUser(userId)

    if (error) return { error: error.message }

    return { success: true }
})
