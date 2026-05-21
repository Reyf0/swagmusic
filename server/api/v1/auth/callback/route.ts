import { defineEventHandler, getQuery, getRequestURL, sendRedirect } from 'h3'
import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
    const { code, next } = getQuery(event)
    const requestUrl = getRequestURL(event)

    let safeNext = '/'
    if (typeof next === 'string' && next.startsWith('/')) {
        safeNext = next
    }

    if (typeof code === 'string' && code.length > 0) {
        const supabase = await serverSupabaseClient(event)
        const { error } = await supabase.auth.exchangeCodeForSession(code)

        if (!error) {
            return sendRedirect(event, new URL(safeNext, requestUrl.origin).toString(), 302)
        }
    }

    return sendRedirect(
        event,
        new URL('/auth/auth-code-error', requestUrl.origin).toString(),
        302,
    )
})