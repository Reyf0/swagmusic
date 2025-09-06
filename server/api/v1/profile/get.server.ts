// Example

import { serverSupabaseClient } from '#supabase/server'
import type { H3Event } from 'h3'
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types"



export default defineEventHandler(async (event: H3Event) => {
    const supabase:SupabaseClient<Database> = serverSupabaseClient(event)
    // пример: читать slug из query
    const url = new URL(event.request.url)
    const slug = url.searchParams.get('slug')
    if (!slug) return { profile: null }


    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .ilike('slug', slug)
        .limit(1)
        .single()


    if (error) {
        event.res.statusCode = 500
        return { error: String(error.message) }
    }


// возврати payload — на клиенте вызови useProfileStore().hydrateFromServer(payload.profile)
    return { profile: data }
})