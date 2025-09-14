import type { Track, TrackWithAuthors } from '@/types' // твои существующие алиасы (ui.ts / index.ts)
import type { TrackUI } from '@/types'

/**
 * Дискриминированные сущности трека — не мутируем исходные DB-row,
 * а возвращаем обогащённые копии с полем `kind`.
 */

export type TrackEntityBase = Track & { readonly kind: 'base' }
export type TrackEntityWithAuthors = (TrackWithAuthors | (Track & { track_authors?: any[] })) & {
    readonly kind: 'withAuthors'
    /** Удобное поле authors — всегда массив (в отличие от разных форматов в DB) */
    readonly authors: { id: string; username?: string | null; avatar_url?: string | null }[]
}
export type TrackEntityUI = TrackUI & { readonly kind: 'ui' }

/** Union для функций/компонентов, которые принимают любой вид трека */
export type TrackEntity = TrackEntityBase | TrackEntityWithAuthors | TrackEntityUI

/** Type guards */
export function isTrackWithAuthors(t: TrackEntity): t is TrackEntityWithAuthors {
    return t.kind === 'withAuthors'
}
export function isTrackBase(t: TrackEntity): t is TrackEntityBase {
    return t.kind === 'base'
}
export function isTrackUI(t: TrackEntity): t is TrackEntityUI {
    return t.kind === 'ui'
}
