// stores/searchStore.ts
import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Tables } from '@/types/database.types'

// Define proper TypeScript interfaces for search results
export interface TrackWithAuthors {
  id: string
  title: string
  album_id: string | null
  audio_url: string | null
  cover_url: string | null
  created_at: string | null
  duration_seconds: number | null
  likes_count: number
  user_id: string | null
  track_authors?: Array<{
    author_id: string
    order_index: number | null
    track_id: string
    author?: Tables<'authors'> | null
  }> | null
}

export const useSearchStore = defineStore('searchStore', () => {
  const query = ref('')
  const results = ref<TrackWithAuthors[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const hasSearched = ref(false)

  const clearError = () => {
    error.value = null
  }

  const clearResults = () => {
    results.value = []
    error.value = null
    hasSearched.value = false
  }

  const searchTracks = async (supabase: SupabaseClient<Database>) => {
    // Input validation
    if (!query.value.trim()) {
      clearResults()
      return
    }

    // Validate query length
    if (query.value.trim().length < 2) {
      error.value = 'Search query must be at least 2 characters long'
      return
    }

    isLoading.value = true
    clearError()

    try {
      const { data, error: supabaseError } = await supabase
        .from('tracks')
        .select(`
          *,
          track_authors (
            *,
            author:authors(*)
          )
        `)

      if (supabaseError) {
        console.error('Search error:', supabaseError)
        
        // Provide user-friendly error messages based on error type
        if (supabaseError.code === 'PGRST116') {
          error.value = 'Search service is temporarily unavailable. Please try again later.'
        } else if (supabaseError.message.includes('connection')) {
          error.value = 'Connection error. Please check your internet connection and try again.'
        } else if (supabaseError.message.includes('timeout')) {
          error.value = 'Search request timed out. Please try again with a more specific query.'
        } else {
          error.value = 'An error occurred while searching. Please try again.'
        }
        
        results.value = []
      } else {
        // Filter results client-side (this addresses the search logic)
        const filteredResults = (data || []).filter(track => {
          const lowerQuery = query.value.toLowerCase()

          const titleMatch = track.title?.toLowerCase().includes(lowerQuery) ?? false
          const authorMatch = track.track_authors?.some(ta =>
            ta.author?.name?.toLowerCase().includes(lowerQuery) ?? false
          ) ?? false

          return titleMatch || authorMatch
        })

        results.value = filteredResults as TrackWithAuthors[]
        hasSearched.value = true
        
        // Clear error if search was successful
        error.value = null
      }
    } catch (err) {
      console.error('Unexpected search error:', err)
      error.value = 'An unexpected error occurred. Please try again.'
      results.value = []
    } finally {
      isLoading.value = false
    }
  }

  return { 
    query, 
    results, 
    isLoading, 
    error, 
    hasSearched, 
    searchTracks, 
    clearError, 
    clearResults 
  }
})