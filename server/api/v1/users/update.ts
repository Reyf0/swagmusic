import { createClient } from '@supabase/supabase-js'
import type { H3Event } from 'h3';
import { readBody } from 'h3'
import type { Database } from '~/types/database.types'
import * as z from 'zod'

const supabase = createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const schema = z.object({
    user_id: z.string().uuid(),
    email: z.string().email().optional(),
    password: z.string().min(6).optional(),
    username: z.string().min(3).optional()
})

export default defineEventHandler(async (event: H3Event) => {
    const body = await readBody(event)

    const { user_id, email, username } = body

    if (!user_id) {
        return { error: 'Missing userId' }
    }

    const { data, error } = await supabase.auth.admin.updateUserById(user_id, {
        email,
        user_metadata: { username }
    })

    if (error) return { error: error.message }

    return { user: data.user }
})
