import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'
import { profileUpdateSchema } from '@/lib/schemas/profile'
import type { ProfileUpdateInput } from '@/lib/schemas/profile'

// Типы
type ProfilesRow = Database['public']['Tables']['profiles']['Row']

export const useProfileStore = defineStore('profile', () => {
  const supabase: SupabaseClient<Database> = useSupabaseClient()
  const authUser = useSupabaseUser() // reactive user from supabase auth

  // State
  const profile = ref<ProfilesRow | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const isHydrated = ref(false)

  // Computed
  const id = computed(() => profile.value?.id ?? authUser.value?.id ?? null)
  const isLoggedIn = computed(() => !!authUser.value)
  const displayName = computed(() => {
    return profile.value?.full_name || profile.value?.username || authUser.value?.user_metadata?.username || authUser.value?.email?.split('@')[0] || null
  })
  const avatarUrl = computed(() => profile.value?.avatar_url ?? null)
  const isAdmin = computed(() => !!profile.value?.is_admin)

  // Actions

  // init — call once during app startup (client). Subscribes to auth events and loads profile if available.
  async function init() {
    if (isHydrated.value) return
    // If authUser is already present, load profile
    if (authUser.value?.id) {
      await loadProfile(authUser.value.id)
    }
    // subscribe to onAuthStateChange to load/clear profile
    try {
      const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_OUT') {
          clearProfile()
        } else if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
          // load profile for new user
          const uid = session?.user?.id
          if (uid) await loadProfile(uid)
        }
      })
      // You may want to save `data.subscription` to unsubscribe later. We intentionally do not auto-unsubscribe.
    } catch (err) {
      // some runtimes may not support onAuthStateChange in the same way — ignore if not available
      console.warn('profile.init: onAuthStateChange not available', err)
    }

    isHydrated.value = true
  }

  // loadProfile(userId) — fetch profile row from DB (client-side). Uses RLS rules, so client can call.
  async function loadProfile(userId?: string) {
    loading.value = true
    error.value = null
    try {
      const uid = userId ?? authUser.value?.id
      if (!uid) {
        profile.value = null
        return null
      }
      const { data, error: supError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', uid)
        .limit(1)
        .single()

      if (supError) throw supError
      profile.value = data as ProfilesRow
      return profile.value
    } catch (err: any) {
      error.value = String(err?.message ?? err)
      profile.value = null
      return null
    } finally {
      loading.value = false
    }
  }

  // refresh — re-fetch current user's profile
  async function refresh() {
    return loadProfile(id.value ?? undefined)
  }

  // updateProfile — validates payload with Zod, uses upsert/update through RLS
  async function updateProfile(input: ProfileUpdateInput) {
    loading.value = true
    error.value = null
    try {
      const parsed = profileUpdateSchema.parse(input)
      const uid = id.value
      if (!uid) throw new Error('Not authenticated')

      // Use .update().eq('id', uid) to follow RLS policies
      const { data, error: supError } = await supabase
        .from('profiles')
        .update(parsed)
        .eq('id', uid)
        .select()
        .single()

      if (supError) throw supError
      profile.value = data as ProfilesRow
      return profile.value
    } catch (err: any) {
      // if it's Zod error, return message
      if (err?.name === 'ZodError') {
        error.value = (err as any).message
      } else {
        error.value = String(err?.message ?? err)
      }
      throw err
    } finally {
      loading.value = false
    }
  }

  // setProfileLocally — useful for SSR hydration or optimistic updates
  function setProfileLocally(p: ProfilesRow | null) {
    profile.value = p
  }

  function clearProfile() {
    profile.value = null
  }

  // sign out helper
  async function signOut() {
    try {
      await supabase.auth.signOut()
    } finally {
      clearProfile()
    }
  }

  // SSR helper: hydrate store from server payload (call on client during mount)
  function hydrateFromServer(payload: Partial<ProfilesRow> | null) {
    if (payload) profile.value = payload as ProfilesRow
    isHydrated.value = true
  }

  return {
    // state
    profile, loading, error, isHydrated,
    // computed
    id, isLoggedIn, displayName, avatarUrl, isAdmin,
    // actions
    init, loadProfile, refresh, updateProfile, setProfileLocally, clearProfile, signOut, hydrateFromServer
  }
})


