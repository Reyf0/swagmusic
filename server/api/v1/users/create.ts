import { createClient } from '@supabase/supabase-js'
import type { H3Event } from 'h3';
import { readBody, getHeader } from 'h3'
import type { Database } from '~/types/database.types'
import * as z from 'zod'

const supabaseAdmin = createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const userSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6, 'Password must be at least 6 characters long'),
    username: z.string().min(3, 'Username must be at least 3 characters long')
})

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
    const parsed = userSchema.safeParse(body)
    if (!parsed.success) {
        return createError({ statusCode: 400, statusMessage: parsed.error.message, data: parsed.error.flatten() })
    }

    const { email, password, username } = parsed.data

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        user_metadata: { username },
        email_confirm: true
    })

    if (error) {
        return createError({ statusCode: 500, statusMessage: error.message })
    }

    return { user: data.user }
})
