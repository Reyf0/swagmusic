import type { H3Event } from "h3";
import supabaseAdmin from '../../../utils/supabaseClient'



export default defineEventHandler(async (event: H3Event) => {
    const authHeader = getHeader(event, 'authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (!token) {
        createError({ statusCode: 401, statusMessage: 'Missing authorization header' })
    }

    const { data: supabaseUser, authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !supabaseUser || !supabaseUser.user) {
        return createError({ statusCode: 401, statusMessage: 'Invalid token'} )
    }

    // Проверяем is_admin в профиле
    const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('is_admin')
        .eq('id', supabaseUser.user.id)
        .single()

    if (profileError || !profile) {
        return createError({ statusCode: 500, statusMessage: 'Profile not found or error fetching profile'})
    }
    if (!profile?.is_admin) {
        return createError({ statusCode: 403, statusMessage: 'Access denied'})
    }

    const { data, error } = await supabaseAdmin
        .from('profiles')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })

    if (error) {
        return createError({ statusCode: 500, statusMessage: error.message})
    }

    return { users: data}
})