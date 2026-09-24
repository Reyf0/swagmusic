import { describe, expect, it } from 'vitest'
import { slugify, isUniqueViolation } from '~/utils/slug'
import { formatDuration } from '~/utils/formatDuration'
import { storagePathFromPublicUrl } from '~/utils/storage'

describe('slugify', () => {
    it('transliterates Cyrillic and strips punctuation', () => {
        expect(slugify('Привет, Мир!')).toBe('privet-mir')
        expect(slugify('Щука и ёж')).toBe('schuka-i-ezh')
    })

    it('removes diacritics and collapses separators', () => {
        expect(slugify('  Café -- Déjà vu  ')).toBe('cafe-deja-vu')
    })

    it('falls back to "item" and respects max length', () => {
        expect(slugify('!!!')).toBe('item')
        expect(slugify('a'.repeat(100), 10)).toHaveLength(10)
    })
})

describe('isUniqueViolation', () => {
    it('detects Postgres unique violations', () => {
        expect(isUniqueViolation({ code: '23505' })).toBe(true)
        expect(isUniqueViolation({ message: 'duplicate key value violates unique constraint' })).toBe(true)
        expect(isUniqueViolation({ code: '42501', message: 'permission denied' })).toBe(false)
        expect(isUniqueViolation(null)).toBe(false)
    })
})

describe('formatDuration', () => {
    it('formats seconds', () => {
        expect(formatDuration(272)).toBe('4:32')
        expect(formatDuration(5)).toBe('0:05')
        expect(formatDuration(3725)).toBe('1:02:05')
    })

    it('handles missing values', () => {
        expect(formatDuration(0)).toBe('0:00')
        expect(formatDuration(null)).toBe('0:00')
        expect(formatDuration(Number.NaN)).toBe('0:00')
    })
})

describe('storagePathFromPublicUrl', () => {
    const base = 'https://x.supabase.co/storage/v1/object/public'

    it('extracts and decodes the object path', () => {
        expect(storagePathFromPublicUrl('covers', `${base}/covers/u1/My%20Cover.png?t=1`)).toBe('u1/My Cover.png')
    })

    it('returns null for other buckets or non-storage URLs', () => {
        expect(storagePathFromPublicUrl('covers', `${base}/tracks/a.mp3`)).toBeNull()
        expect(storagePathFromPublicUrl('covers', 'https://example.com/a.png')).toBeNull()
        expect(storagePathFromPublicUrl('covers', null)).toBeNull()
    })
})
