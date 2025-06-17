export const useTracks = async () => {
    const supabase = useSupabaseClient()

    const { data, error } = await supabase
        .from('tracks')
        .select(`
      id,
      title,
      audio_url,
      cover_url,
      track_authors (
        author:authors (
          id,
          name
        )
      )
    `)

    if (error) throw new Error(error.message)
    return data
}
