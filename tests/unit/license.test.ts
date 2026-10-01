import { describe, expect, it } from 'vitest'
import { ccLicenseLabel, trackAttribution } from '#shared/utils/license'

describe('ccLicenseLabel', () => {
    it('names Creative Commons licenses from their deed URL', () => {
        expect(ccLicenseLabel('http://creativecommons.org/licenses/by/4.0/')).toBe('CC BY 4.0')
        expect(ccLicenseLabel('https://creativecommons.org/licenses/by-sa/3.0/')).toBe('CC BY-SA 3.0')
        expect(ccLicenseLabel('http://creativecommons.org/licenses/by-nc-nd/2.5/it/')).toBe('CC BY-NC-ND 2.5')
        expect(ccLicenseLabel('https://creativecommons.org/publicdomain/zero/1.0/')).toBe('CC0 1.0')
    })

    it('returns null for anything else', () => {
        expect(ccLicenseLabel('https://example.com/licenses/by/4.0/')).toBeNull()
        expect(ccLicenseLabel('https://creativecommons.org/licenses/whatever/1.0/')).toBeNull()
        expect(ccLicenseLabel('not a url')).toBeNull()
        expect(ccLicenseLabel(null)).toBeNull()
    })
})

describe('trackAttribution', () => {
    it('builds the credit for an imported track', () => {
        expect(trackAttribution({
            source: 'jamendo',
            jamendo_id: '42',
            license_url: 'http://creativecommons.org/licenses/by-nc-sa/3.0/',
            share_url: 'https://www.jamendo.com/track/42',
        })).toEqual({
            license: 'CC BY-NC-SA 3.0',
            licenseUrl: 'http://creativecommons.org/licenses/by-nc-sa/3.0/',
            originalUrl: 'https://www.jamendo.com/track/42',
            sourceName: 'Jamendo',
        })
    })

    it('is null for tracks uploaded here', () => {
        expect(trackAttribution(null)).toBeNull()
        expect(trackAttribution({})).toBeNull()
        expect(trackAttribution({ source: 'jamendo' })).toBeNull()
    })
})
