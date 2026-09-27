/**
 * Statuses of a track_authors row (a credit). The uploader credits themselves as `accepted`;
 * co-authors start as `pending` and answer the invite with `accepted` / `rejected`.
 */
export const CREDIT_STATUS = {
    pending: 'pending',
    accepted: 'accepted',
    rejected: 'rejected',
} as const

/** Statuses shown as a credit. `approved` is the old name of `accepted`, still on older rows. */
export const CREDITED_STATUSES: string[] = [CREDIT_STATUS.accepted, 'approved']

export const isCredited = (status: string | null | undefined) => !!status && CREDITED_STATUSES.includes(status)
