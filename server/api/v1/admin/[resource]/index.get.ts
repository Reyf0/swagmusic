import * as z from 'zod'

const querySchema = z.object({
    q: z.string().trim().max(100).optional(),
    limit: z.coerce.number().int().min(1).max(200).default(50),
    offset: z.coerce.number().int().min(0).default(0),
})

/** Admin: list tracks / albums / playlists, newest first, optionally searched. */
export default defineEventHandler(async (event) => {
    await requireAdmin(event)
    const resource = getAdminResource(event)
    const config = ADMIN_RESOURCES[resource]

    const parsed = querySchema.safeParse(getQuery(event))
    if (!parsed.success) throw createError({ statusCode: 400, statusMessage: 'Invalid query' })
    const { q, limit, offset } = parsed.data

    let query = useSupabaseAdmin()
        .from(resource)
        .select(config.select, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

    if (q) {
        const pattern = orIlikePattern(q)
        query = query.or(config.search.map(col => `${col}.ilike.${pattern}`).join(','))
    }

    const { data, error, count } = await query
    if (error) throw createError({ statusCode: 500, statusMessage: error.message })

    return { items: data ?? [], total: count ?? 0 }
})
