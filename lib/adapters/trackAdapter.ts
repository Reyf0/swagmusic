import type { TrackEntity, TrackEntityBase, TrackEntityWithAuthors, TrackEntityUI } from '@/types/track-entities'
import type { Track, TrackWithAuthors } from '@/types'
import type { TrackUI } from '@/types'

/**
 * helpers для безопасного извлечения authors из разных форматов,
 * которые приходят из DB (track_authors join или view authors json)
 */
function extractAuthorsFromRow(row: any) {
    // возможные форматы:
    // 1) row.track_authors = [{ author: { id, username, avatar_url, ... } }, ...]
    // 2) row.authors = [{ id, username, avatar_url }, ...] (если view возвращает authors)
    // 3) отсутствуют
    const out: { id: string; username?: string | null; avatar_url?: string | null }[] = []

    if (!row) return out

    if (Array.isArray(row.track_authors)) {
        for (const ta of row.track_authors) {
            const a = ta?.author ?? ta // if structure slightly different
            if (a && a.id) out.push({ id: a.id, username: a.username ?? null, avatar_url: a.avatar_url ?? null })
        }
    } else if (Array.isArray(row.authors)) {
        for (const a of row.authors) {
            if (a && a.id) out.push({ id: a.id, username: a.username ?? null, avatar_url: a.avatar_url ?? null })
        }
    }

    return out
}

/** Создаёт TrackEntityWithAuthors из DB row (TrackWithAuthors или Track) */
export function toTrackWithAuthors(row: TrackWithAuthors | Track): TrackEntityWithAuthors {
    const authors = extractAuthorsFromRow(row as any)

    // не мутируем исходник — возвращаем новый объект с полем authors и kind
    const out: TrackEntityWithAuthors = {
        ...(row as any),
        authors,
        kind: 'withAuthors'
    } as TrackEntityWithAuthors

    return out
}

/** Создаёт TrackEntityBase (просто помечаем kind) */
export function toTrackBase(row: Track): TrackEntityBase {
    return {
        ...(row as any),
        kind: 'base'
    }
}

/** Создаёт TrackEntityUI: берёт TrackWithAuthors/Track и дополняет UI-полями.
 *  extra может включать is_liked_by_user, is_in_queue и т.д.
 */
export function toTrackUI(row: TrackWithAuthors | Track, extra: Partial<TrackUI> = {}): TrackEntityUI {
    const authors = extractAuthorsFromRow(row as any)
    const base = {
        id: (row as any).id,
        title: (row as any).title,
        authors,
        likes_count: (row as any).likes_count ?? 0,
        album_id: (row as any).album_id ?? null,
        audio_url: (row as any).audio_url ?? null,
        cover_url: (row as any).cover_url ?? null,
        created_at: (row as any).created_at ?? null,
        user_id: (row as any).user_id ?? null,
        duration_seconds: (row as any).duration_seconds ?? null,
        is_liked_by_user: (row as any).is_liked_by_user ?? extra.is_liked_by_user ?? null
    }

    const out: TrackEntityUI = {
        ...base,
        ...extra,
        kind: 'ui'
    } as TrackEntityUI

    return out
}

/** Map array preserving order of ids array (useful when DB returns rows in arbitrary order) */
export function mapRowsToOrderedEntities<TRow extends { id: string }>(
    rows: TRow[],
    idsInOrder: string[],
    mapper: (row: TRow) => TrackEntity
): TrackEntity[] {
    const map = new Map<string, TRow>()
    for (const r of rows) map.set(r.id, r)
    return idsInOrder.map(id => {
        const r = map.get(id)
        if (!r) {
            // missing row — return placeholder base with id
            return ({ id, title: 'Unknown', kind: 'base' } as unknown) as TrackEntity
        }
        return mapper(r)
    })
}
