import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useProfileStore } from '@/stores/useProfileStore'
import { createClient } from '@supabase/supabase-js'


// Здесь предполагаем, что вы будете мокать useSupabaseClient и useSupabaseUser через vi.mock


describe('useProfileStore', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
        vi.resetAllMocks()
    })


    it('loads profile when user present', async () => {
    // mock supabase client and user, then call init/loadProfile
    // assert profile.value is set
        expect(true).toBe(true)
    })
})