/**
 * A count with its noun: plural(1, 'track') → "1 track", plural(3, 'track') → "3 tracks".
 * Pass the plural form for irregular nouns: plural(2, 'person', 'people').
 */
export function plural(count: number, one: string, many = `${one}s`) {
    return `${count} ${count === 1 ? one : many}`
}
