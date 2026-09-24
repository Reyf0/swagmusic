export default defineEventHandler(async (event) => {
    await requireAdmin(event)

    const { data, error } = await useSupabaseAdmin()
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

    if (error) {
        throw createError({ statusCode: 500, statusMessage: error.message })
    }

    return { users: data }
})
