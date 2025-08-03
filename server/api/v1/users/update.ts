import { createClient } from '@supabase/supabase-js'
import type { H3Event} from 'h3';
import { readBody } from 'h3'
import type { Database } from '~/types/database.types'

const supabase = createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default defineEventHandler(async (event: H3Event) => {
    const body = await readBody(event)

    const { userId, email, username } = body

    if (!userId) {
        return { error: 'Missing userId' }
    }

    const { data, error } = await supabase.auth.admin.updateUserById(userId, {
        email,
        user_metadata: { username }
    })

    if (error) return { error: error.message }

    return { user: data.user }
})
