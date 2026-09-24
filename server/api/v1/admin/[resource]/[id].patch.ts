import * as z from 'zod'

const bodySchema = z.record(z.string(), z.string().trim().max(1000).nullable())

/** Admin: edit whitelisted text fields of a track / album / playlist. */
export default defineEventHandler(async (event) => {
    await requireAdmin(event)
    const resource = getAdminResource(event)
    const id = getRouterParam(event, 'id')
    if (!id || !z.string().uuid().safeParse(id).success) throw createError({ statusCode: 400, statusMessage: 'Invalid id' })

    const parsed = bodySchema.safeParse(await readBody(event))
    if (!parsed.success) throw createError({ statusCode: 400, statusMessage: 'Invalid request body' })

    const editable = ADMIN_RESOURCES[resource].editable as readonly string[]
    const patch = Object.fromEntries(Object.entries(parsed.data).filter(([key]) => editable.includes(key)))
    if (!Object.keys(patch).length) throw createError({ statusCode: 400, statusMessage: 'Nothing to update' })

    const { error } = await useSupabaseAdmin().from(resource).update(patch).eq('id', id)
    if (error) throw createError({ statusCode: 400, statusMessage: error.message })

    return { success: true }
})
