import { createClient } from '@supabase/supabase-js'
import type { H3Event} from 'h3';
import { readBody, getHeader } from 'h3'
import type { Database } from '~/types/database.types'

const supabaseAdmin = createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default defineEventHandler(async (event: H3Event) => {
    const authHeader = getHeader(event, 'authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (!token) {
        return { status: 401, body: { error: 'Missing authorization header' } }
    }

    const { data: supabase, authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !supabase || !supabase.user) {
        return { status: 401, body: { error: 'Invalid token' } }
    }

    // Проверяем is_admin в профиле
    const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('is_admin')
        .eq('id', supabase.user.id)
        .single()

    if (profileError || !profile) {
        return {status: 500, body: {error: 'Profile not found or error fetching profile'}}
    }
    if (!profile?.is_admin) {
        return { status: 403, body: { error: 'Access denied' } }
    }

    const body = await readBody(event)
    const { email, password, username } = body

    if (!email || !password || !username) {
        return { status: 400, body: { error: 'Missing fields' } }
    }

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        user_metadata: { username },
        email_confirm: true
    })

    if (error) {
        return { status: 500, body: { error: error.message } }
    }

    return { user: data.user }
})
