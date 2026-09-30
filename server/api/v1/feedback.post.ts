import { createHmac } from 'node:crypto'
import * as z from 'zod'

const optionalText = (max: number) => z.string().trim().max(max).optional().transform(v => v || null)

const feedbackSchema = z.object({
    kind: z.enum([...FEEDBACK_KINDS, 'report']),
    message: z.string().trim().min(1, 'Please write a message').max(FEEDBACK_MESSAGE_MAX),
    email: z.union([z.literal(''), z.string().trim().email('Enter a valid email address').max(254)]).optional().transform(v => v || null),
    target_type: z.enum(REPORT_TARGETS).optional(),
    target_id: z.string().uuid().optional(),
    report_reason: z.enum(REPORT_REASONS).optional(),
    page_url: optionalText(500),
    // Honeypot: a field people never see. Bots that fill every input get a fake success.
    website: z.string().optional(),
}).refine(
    f => (f.kind === 'report') === !!(f.target_type && f.target_id && f.report_reason),
    { message: 'A report needs what it is about and a reason' },
)

const TARGET_TABLE = { track: 'tracks', album: 'albums', playlist: 'playlists', artist: 'profiles' } as const

// At most this many messages per sender (IP or account) in the window.
const RATE_LIMIT = 5
const RATE_WINDOW_MINUTES = 10

/** Anyone (signed in or not) sends feedback or reports content. */
export default defineEventHandler(async (event) => {
    const parsed = feedbackSchema.safeParse(await readBody(event))
    if (!parsed.success) {
        throw createError({ statusCode: 400, statusMessage: parsed.error.issues[0]?.message ?? 'Invalid feedback' })
    }
    const { website, ...input } = parsed.data
    if (website) return { ok: true }

    const supabase = useSupabaseAdmin()
    const user = await getRequestUser(event)

    // Keyed hash of the IP: enough to count messages from one sender without storing the address.
    const ip = getRequestIP(event, { xForwardedFor: true }) ?? 'unknown'
    const ipHash = createHmac('sha256', useRuntimeConfig().supabaseSecretKey || 'feedback').update(ip).digest('hex').slice(0, 32)

    const since = new Date(Date.now() - RATE_WINDOW_MINUTES * 60_000).toISOString()
    const sender = user ? `ip_hash.eq.${ipHash},user_id.eq.${user.id}` : `ip_hash.eq.${ipHash}`
    const { count, error: countError } = await supabase
        .from('feedback')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', since)
        .or(sender)
    if (countError) throw createError({ statusCode: 500, statusMessage: 'Could not send feedback' })
    if ((count ?? 0) >= RATE_LIMIT) {
        throw createError({ statusCode: 429, statusMessage: 'You have sent a lot of messages. Please try again in a few minutes.' })
    }

    if (input.kind === 'report') {
        const { data: target } = await supabase.from(TARGET_TABLE[input.target_type!]).select('id').eq('id', input.target_id!).maybeSingle()
        if (!target) throw createError({ statusCode: 404, statusMessage: 'The reported item does not exist' })
    }

    const { error } = await supabase.from('feedback').insert({
        kind: input.kind,
        message: input.message,
        email: input.email,
        user_id: user?.id ?? null,
        target_type: input.kind === 'report' ? input.target_type! : null,
        target_id: input.kind === 'report' ? input.target_id! : null,
        report_reason: input.kind === 'report' ? input.report_reason! : null,
        page_url: input.page_url,
        user_agent: getHeader(event, 'user-agent')?.slice(0, 500) ?? null,
        ip_hash: ipHash,
    })
    if (error) {
        console.error('Feedback insert failed', error)
        throw createError({ statusCode: 500, statusMessage: 'Could not send feedback' })
    }

    event.node.res.statusCode = 201
    return { ok: true }
})
