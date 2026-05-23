/** Нормализация: unaccent + lowercase + заменяем не-алфанумерические на '-' */
export function slugify(input: string, maxLen = 60): string {
    if (!input) return 'item'
    // Normalize and remove diacritics
    const normalized = input
        .normalize('NFKD')               // разделяет символы и диакритику
        .replace(/[\u0300-\u036f]/g, '') // удаляет combining marks
    // transliteration not implemented — basic approach: remove non-latin/num by regex
    // replace non-word characters with hyphen
    const slug = normalized
        .toLowerCase()
        .replace(/[^a-z0-9\u00C0-\u024f]+/g, '-') // keep some latin extended chars
        .replace(/^-+|-+$/g, '') // trim hyphens
        .replace(/-{2,}/g, '-')  // collapse multiple hyphens
        .slice(0, maxLen)
    return slug || 'item'
}

/** Random digits string */
export function randomDigits(n = 4) {
    const min = Math.pow(10, n - 1)
    const max = Math.pow(10, n) - 1
    return String(Math.floor(Math.random() * (max - min + 1) + min))
}

/** Попытки определить unique-violation из ошибки Supabase */
export function isUniqueViolation(err: any): boolean {
    if (!err) return false
    // Supabase error may contain code '23505' or message with 'duplicate key' / 'already exists'
    const msg = String(err?.message ?? err?.details ?? '').toLowerCase()
    if (err?.code === '23505') return true
    if (msg.includes('duplicate key') || msg.includes('already exists') || msg.includes('unique')) return true
    return false
}
