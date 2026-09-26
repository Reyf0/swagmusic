import type { Ref } from 'vue'

const FALLBACK = '#D3D3D3'

type RGB = [number, number, number]

type Options = {
    sampleSize?: number // max pixels used for clustering (default 900)
    k?: number // k-means clusters (default 3)
    saturationThreshold?: number // min saturation 0..1 when filtering (default 0.15)
    lightnessIgnore?: { min: number; max: number } // lightness range treated as white/black, 0..1
    iterations?: number // k-means iterations
}

function rgbToHex([r, g, b]: RGB) {
    const toHex = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase()
}

function rgbToHsl([r, g, b]: RGB) {
    r /= 255; g /= 255; b /= 255
    const max = Math.max(r, g, b), min = Math.min(r, g, b)
    let h = 0, s = 0
    const l = (max + min) / 2
    if (max !== min) {
        const d = max - min
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
        if (max === r) h = (g - b) / d + (g < b ? 6 : 0)
        else if (max === g) h = (b - r) / d + 2
        else h = (r - g) / d + 4
        h /= 6
    }
    return { h, s, l }
}

function distance(a: RGB, b: RGB) {
    return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])
}

function kmeans(samples: RGB[], k: number, iterations: number) {
    // init centroids: k random distinct samples
    const picked = new Set<number>()
    while (picked.size < Math.min(k, samples.length)) picked.add(Math.floor(Math.random() * samples.length))
    const centroids: RGB[] = [...picked].map(i => [...samples[i]!] as RGB)

    const assignments = new Array<number>(samples.length).fill(0)
    for (let iter = 0; iter < iterations; iter++) {
        samples.forEach((s, i) => {
            let best = 0, bestDist = Infinity
            centroids.forEach((c, j) => {
                const d = distance(s, c)
                if (d < bestDist) { bestDist = d; best = j }
            })
            assignments[i] = best
        })
        const sums = centroids.map((): RGB => [0, 0, 0])
        const counts = centroids.map(() => 0)
        samples.forEach((s, i) => {
            const sum = sums[assignments[i]!]!
            sum[0] += s[0]; sum[1] += s[1]; sum[2] += s[2]
            counts[assignments[i]!]! += 1
        })
        centroids.forEach((c, j) => {
            const n = counts[j]!
            if (n) { const sum = sums[j]!; c[0] = sum[0] / n; c[1] = sum[1] / n; c[2] = sum[2] / n }
        })
    }

    const sizes = centroids.map(() => 0)
    for (const a of assignments) sizes[a]! += 1
    return centroids.map((centroid, j) => ({ centroid, size: sizes[j]! }))
}

/** Dominant colour of an <img> (for the Now Playing background), as a reactive hex string. */
export function useDominantColorFromImg(imgRef: Ref<HTMLImageElement | null>, opts: Options = {}) {
    const {
        sampleSize = 900,
        k = 3,
        saturationThreshold = 0.15,
        lightnessIgnore = { min: 0.02, max: 0.98 },
        iterations = 8,
    } = opts

    const color = ref(FALLBACK)

    function readPixels(img: HTMLImageElement): Uint8ClampedArray | null {
        const w = img.naturalWidth || img.width
        const h = img.naturalHeight || img.height
        if (!w || !h) return null
        // scale down so that sw * sh ≈ sampleSize
        const ratio = Math.sqrt((w * h) / sampleSize)
        const canvas = document.createElement('canvas')
        canvas.width = Math.max(1, Math.round(w / ratio))
        canvas.height = Math.max(1, Math.round(h / ratio))
        const ctx = canvas.getContext('2d')
        if (!ctx) return null
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        try {
            return ctx.getImageData(0, 0, canvas.width, canvas.height).data
        } catch (e) {
            console.warn('Canvas is tainted (CORS). Add crossorigin and allow the origin on the server.', e)
            return null
        }
    }

    function collect(data: Uint8ClampedArray, satMin: number, lightMin: number, lightMax: number) {
        const out: RGB[] = []
        for (let i = 0; i + 3 < data.length; i += 4) {
            if (data[i + 3] === 0) continue // transparent
            const px: RGB = [data[i]!, data[i + 1]!, data[i + 2]!]
            const { s, l } = rgbToHsl(px)
            if (l <= lightMin || l >= lightMax || s < satMin) continue
            out.push(px)
        }
        return out
    }

    function compute(img: HTMLImageElement | null) {
        if (!img?.src) {
            color.value = FALLBACK
            return
        }
        if (!img.complete || !img.naturalWidth) return // the load listener will call us again
        try {
            const data = readPixels(img)
            if (!data) {
                color.value = FALLBACK
                return
            }

            // Prefer saturated, non white/black pixels; relax the filters for grey covers.
            let sat = saturationThreshold, lightMin = lightnessIgnore.min, lightMax = lightnessIgnore.max
            let samples = collect(data, sat, lightMin, lightMax)
            while (samples.length < 8 && sat > 0) {
                sat = Math.max(0, sat - 0.05)
                lightMin = Math.max(0, lightMin - 0.01)
                lightMax = Math.min(1, lightMax + 0.01)
                samples = collect(data, sat, lightMin, lightMax)
            }
            if (!samples.length) samples = collect(data, 0, -1, 2) // every opaque pixel
            if (!samples.length) {
                color.value = FALLBACK
                return
            }

            // Biggest cluster wins, with a bonus for saturated colours.
            const best = kmeans(samples, k, iterations)
                .map(c => ({ ...c, score: c.size * (1 + rgbToHsl(c.centroid).s) }))
                .sort((a, b) => b.score - a.score)[0]
            color.value = best ? rgbToHex(best.centroid) : FALLBACK
        } catch (err) {
            console.error('dominant color error', err)
            color.value = FALLBACK
        }
    }

    const onLoad = (e: Event) => compute(e.target as HTMLImageElement)

    // New element: move the load listener over. New src on the same element: the load event fires again.
    watch(imgRef, (el, prev) => {
        prev?.removeEventListener('load', onLoad)
        el?.addEventListener('load', onLoad)
        compute(el)
    }, { immediate: true })

    onBeforeUnmount(() => imgRef.value?.removeEventListener('load', onLoad))

    return { color }
}
