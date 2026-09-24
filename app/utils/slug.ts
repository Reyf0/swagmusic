const CYRILLIC: Record<string, string> = {
    а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm',
    н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch',
    ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya', і: 'i', ї: 'yi', є: 'ye', ґ: 'g',
}

/** "Привет, Мир! Café" → "privet-mir-cafe". Returns "item" when nothing is left. */
export function slugify(input: string, maxLen = 60): string {
    if (!input) return 'item'
    const transliterated = Array.from(input.toLowerCase())
        .map(ch => CYRILLIC[ch] ?? ch)
        .join('')
    const slug = transliterated
        .normalize('NFKD')
        .replace(/[̀-ͯ]/g, '') // strip diacritics
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, maxLen)
        .replace(/-+$/g, '')
    return slug || 'item'
}

/** True for Postgres unique violations as reported by Supabase. */
export function isUniqueViolation(err: any): boolean {
    if (!err) return false
    if (err.code === '23505') return true
    const msg = String(err.message ?? err.details ?? '').toLowerCase()
    return msg.includes('duplicate key') || msg.includes('already exists')
}
