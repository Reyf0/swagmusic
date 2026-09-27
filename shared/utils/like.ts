/** Escapes LIKE wildcards so user input matches literally in `.ilike(column, …)`. */
export function escapeLike(value: string): string {
    return value.replace(/[\\%_]/g, ch => `\\${ch}`)
}

/**
 * `%term%` for use inside a PostgREST `.or('col.ilike.<pattern>,…')` filter. Characters that
 * would break the filter syntax (commas, parentheses, quotes) are dropped.
 */
export function orIlikePattern(value: string): string {
    const cleaned = value.replace(/[,()"\\]/g, ' ').replace(/[%_]/g, ' ').trim()
    return `%${cleaned}%`
}
