import type { SupabaseClient } from "@supabase/supabase-js";

export default defineNuxtPlugin(async () => {
    const supabase: SupabaseClient<Database> = useSupabase()

    console.log("SUPABASE:", supabase)

    const user = useSupabaseUser()
    const session = useSupabaseSession()


    const {
        data,
    } = await supabase.auth.getSession()

    session.value = data.session
    user.value = data.session?.user ?? null


    supabase.auth.onAuthStateChange((_event, newSession) => {
        session.value = newSession
        user.value = newSession?.user ?? null
    })
})