import * as z from 'zod'

const schema = z.object({
    userId: z.string().uuid()
})

const BUCKETS = ['tracks', 'covers', 'avatars'] as const

/**
 * Admin: delete a user with everything they own. The database removes their profile, uploads,
 * playlists, likes and history (ON DELETE CASCADE, see migration 20261001000000); the files in
 * storage are removed here.
 */
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

    const supabase = useSupabaseAdmin()
    const files = await collectUserFiles(supabase, userId)

    const { error } = await supabase.auth.admin.deleteUser(userId)
    if (error) {
        throw createError({ statusCode: 400, statusMessage: error.message })
    }

    // The account is gone either way; a file that could not be removed is only logged.
    for (const bucket of BUCKETS) {
        const paths = [...files[bucket]]
        if (!paths.length) continue
        const { error: removeError } = await supabase.storage.from(bucket).remove(paths)
        if (removeError) console.error(`Could not remove ${paths.length} file(s) of user ${userId} from ${bucket}`, removeError)
    }

    return { success: true }
})

/** Storage paths of the user's audio, covers and avatar: from the rows that link them and from their own folders. */
async function collectUserFiles(supabase: ReturnType<typeof useSupabaseAdmin>, userId: string) {
    const files: Record<typeof BUCKETS[number], Set<string>> = { tracks: new Set(), covers: new Set(), avatars: new Set() }
    const add = (bucket: typeof BUCKETS[number], url: unknown) => {
        const path = storagePathFromUrl(bucket, url)
        if (path) files[bucket].add(path)
    }

    const [{ data: tracks }, { data: albums }, { data: playlists }, { data: profile }] = await Promise.all([
        supabase.from('tracks').select('audio_url, cover_url').eq('user_id', userId),
        supabase.from('albums').select('cover_url').eq('user_id', userId),
        supabase.from('playlists').select('cover_url').eq('user_id', userId),
        supabase.from('profiles').select('avatar_url').eq('id', userId).maybeSingle(),
    ])
    for (const t of tracks ?? []) {
        add('tracks', t.audio_url)
        add('covers', t.cover_url)
    }
    for (const a of albums ?? []) add('covers', a.cover_url)
    for (const p of playlists ?? []) add('covers', p.cover_url)
    add('avatars', profile?.avatar_url)

    // Newer uploads live in a folder named after the user.
    for (const bucket of BUCKETS) {
        const { data: objects } = await supabase.storage.from(bucket).list(userId, { limit: 1000 })
        for (const o of objects ?? []) {
            if (o.id) files[bucket].add(`${userId}/${o.name}`)
        }
    }
    return files
}
