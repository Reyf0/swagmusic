export type StorageBucket = 'tracks' | 'covers' | 'avatars'

export const MAX_AUDIO_BYTES = 50 * 1024 * 1024
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024

/** Uploads files of the signed-in user to public storage buckets. */
export const useStorageUpload = () => {
    const supabase = useSupabase()
    const user = useSupabaseUser()

    /** Uploads `file` under `<userId>/<uuid>.<ext>` and returns its path and public URL. Throws on failure. */
    async function uploadPublic(bucket: StorageBucket, file: File) {
        const userId = user.value?.id
        if (!userId) throw new Error('You need to sign in to upload files')
        const path = buildStorageKey(userId, file)
        const { error } = await supabase.storage.from(bucket).upload(path, file, {
            contentType: file.type || undefined,
            cacheControl: '31536000',
        })
        if (error) throw new Error(`Upload failed: ${error.message}`)
        const { data } = supabase.storage.from(bucket).getPublicUrl(path)
        return { path, publicUrl: data.publicUrl }
    }

    /** Best-effort delete (used for cleanup after a failed operation). */
    async function remove(bucket: StorageBucket, path: string | null | undefined) {
        if (!path) return
        const { error } = await supabase.storage.from(bucket).remove([path])
        if (error) console.warn(`Could not remove ${bucket}/${path}`, error.message)
    }

    return { uploadPublic, remove }
}
