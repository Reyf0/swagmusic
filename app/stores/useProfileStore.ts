import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Profile } from '#shared/types'
import { profileUpdateSchema } from "#shared/schemas/profile";
import type { ProfileUpdateInput } from "#shared/schemas/profile";
import { useSupabase } from "@/composables/useSupabase";


type ProfilesRow = Profile

export const useProfileStore = defineStore('profile', () => {
  const supabase: SupabaseClient<Database> = useSupabase()
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

  let watchingAuth = false

  // init — called once by the supabase plugin (server and client). Loads the profile of the
  // signed-in user and, on the client, keeps it in sync when the user signs in/out.
  async function init() {
    const uid = authUser.value?.id
    if (uid && profile.value?.id !== uid) await loadProfile(uid)
    if (!uid) clearProfile()

    if (import.meta.client && !watchingAuth) {
      watchingAuth = true
      watch(() => authUser.value?.id, (newId) => {
        if (newId) loadProfile(newId)
        else clearProfile()
      })
    }

    isHydrated.value = true
  }

  // loadProfile() — the signed-in user's own full profile. Private columns (email, settings, is_admin)
  // are not selectable by clients, so it goes through the get_my_profile() RPC.
  async function loadProfile(userId?: string) {
    loading.value = true
    error.value = null
    try {
      const uid = userId ?? authUser.value?.id
      if (!uid) {
        profile.value = null
        return null
      }
      if (uid !== authUser.value?.id) throw new Error("Only the signed-in user's profile can be loaded")
      const { data, error: supError } = await supabase.rpc('get_my_profile').maybeSingle()

      if (supError) throw supError
      profile.value = (data as ProfilesRow | null) ?? null
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

      // RLS limits the update to the own row; no .select() here because private columns
      // can't be returned to clients, so re-read the full row through get_my_profile().
      const { error: supError } = await supabase
        .from('profiles')
        .update(parsed)
        .eq('id', uid)

      if (supError) throw supError
      return await loadProfile(uid)
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


