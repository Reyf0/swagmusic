import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useUserSearchStore = defineStore('userSearchStore', () => {
  const query = ref('')
  const results = ref<any[]>([])
  const isLoading = ref(false)

  const searchUsers = async (supabase: any) => {
    if (!query.value.trim()) {
      results.value = []
      return
    }

    isLoading.value = true

    const { data, error } = await supabase
      .from('profiles')
      .select('*')

    if (error) {
      console.error('User search error:', error)
      results.value = []
    } else {
      const lowerQuery = query.value.toLowerCase()

      results.value = (data || []).filter(user => {
        return (
          user.username?.toLowerCase().includes(lowerQuery) ||
          user.full_name?.toLowerCase().includes(lowerQuery) ||
          user.email?.toLowerCase().includes(lowerQuery)
        )
      })
    }

    isLoading.value = false
  }

  return { query, results, isLoading, searchUsers }
})
