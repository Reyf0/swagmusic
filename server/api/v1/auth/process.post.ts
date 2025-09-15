import { readBody, createError } from 'h3'
import { env } from '@/lib/env'

export default defineEventHandler(async (event) => {
    const body = await readBody(event) as { access_token?: string }
    const accessToken = body?.access_token
    if (!accessToken) throw createError({ statusCode: 400, statusMessage: 'Missing access_token' })

    const config = useRuntimeConfig()

    const SUPABASE_URL =
        env.supabaseUrl ||
        process.env.NUXT_PUBLIC_SUPABASE_URL ||
        process.env.NEXT_PUBLIC_SUPABASE_URL ||
        process.env.SUPABASE_URL

    const ANON_KEY =
        env.supabaseKey ||
        process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
        process.env.SUPABASE_ANON_KEY

    // Диагностика — только длина/начало, не весь ключ
    console.log('DBG: SUPABASE_URL=', SUPABASE_URL ? `${SUPABASE_URL.slice(0,60)}...` : 'undefined')
    console.log('DBG: ANON_KEY len=', ANON_KEY ? ANON_KEY.length : 0)

    // Защита: если чего-то нет — бросаем понятную ошибку
    if (!SUPABASE_URL) {
        console.error('Missing SUPABASE_URL in runtime config / env. Check nuxt.config and deployment env vars.')
        throw createError({ statusCode: 500, statusMessage: 'Server misconfiguration: SUPABASE_URL missing' })
    }
    if (!ANON_KEY) {
        console.error('Missing SUPABASE_ANON_KEY in runtime config / env. Check nuxt.config and deployment env vars.')
        throw createError({ statusCode: 500, statusMessage: 'Server misconfiguration: SUPABASE_ANON_KEY missing' })
    }

    // Убедимся, что URL абсолютный (должен начинаться с http)
    if (!/^https?:\/\//.test(SUPABASE_URL)) {
        console.error('SUPABASE_URL does not start with http/https:', SUPABASE_URL)
        throw createError({ statusCode: 500, statusMessage: 'Server misconfiguration: SUPABASE_URL must include protocol (https://...)' })
    }

    // Real request to Supabase auth user endpoint
    const url = `${SUPABASE_URL.replace(/\/$/, '')}/auth/v1/user`
    const res = await fetch(url, {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            apikey: ANON_KEY,
            Accept: 'application/json',
        },
    })

    const text = await res.text()
    if (!res.ok) {
        // лог для диагностики
        console.error('Supabase /auth/v1/user failed:', res.status, text)
        throw createError({ statusCode: res.status, statusMessage: 'Token validation failed', data: text })
    }

    const user = JSON.parse(text)
    // здесь: создать сессию/куку, перенаправить, сохранить в БД и т.д.
    return { user }
})
