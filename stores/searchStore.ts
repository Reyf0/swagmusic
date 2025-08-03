// stores/searchStore.ts
import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { SupabaseClient } from '@supabase/supabase-js'

export const useSearchStore = defineStore('searchStore', () => {
  const query = ref('')
  const results = ref<any[]>([])
  const isLoading = ref(false)

  const searchTracks = async (supabase: SupabaseClient<Database>) => {
    if (!query.value.trim()) {
      results.value = []
      return
    }

    isLoading.value = true

    const { data, error } = await supabase
      .from('tracks')
      .select(`
        *,
        track_authors (
          *,
          author:authors(*)
        )
      `)

    if (error) {
      console.error('Search error:', error)
      results.value = []
    } else {
      results.value = (data || []).filter(track => {
        const lowerQuery = query.value.toLowerCase()

        const titleMatch = track.title.toLowerCase().includes(lowerQuery)
        const authorMatch = track.track_authors?.some(ta =>
          ta.author?.name.toLowerCase().includes(lowerQuery)
        )

        return titleMatch || authorMatch
      })
    }

    isLoading.value = false
  }

  return { query, results, isLoading, searchTracks }
})