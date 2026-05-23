const FALLBACK = '#D3D3D3'

import { ref, onMounted, watch, nextTick } from 'vue'

type Options = {
    sampleSize?: number // max число пикселей для кластеризации (по умолчанию 900)
    k?: number // число кластеров для k-means (по умолчанию 3)
    saturationThreshold?: number // минимальная насыщенность (0..1) при фильтрации (по умолчанию 0.15)
    lightnessIgnore?: { min: number; max: number } // диапазон l, который игнорируем (white/black), 0..1
    iterations?: number // итерации k-means
}

function rgbToHex([r, g, b]: number[]) {
    const toHex = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase()
}

function rgbToHsl([r, g, b]: number[]) {
    r /= 255; g /= 255; b /= 255
    const max = Math.max(r, g, b), min = Math.min(r, g, b)
    let h = 0, s = 0
    const l = (max + min) / 2
    if (max !== min) {
        const d = max - min
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break
            case g: h = (b - r) / d + 2; break
            case b: h = (r - g) / d + 4; break
        }
        h /= 6
    }
    return { h, s, l }
}

function distanceRGB(a: number[], b: number[]) {
    const dr = a[0] - b[0], dg = a[1] - b[1], db = a[2] - b[2]
    return Math.sqrt(dr*dr + dg*dg + db*db)
}

function kmeans(samples: number[][], k = 3, iterations = 8) {
    if (samples.length === 0) return []
    // init centroids - pick k random distinct samples
    const centroids: number[][] = []
    const used = new Set<number>()
    for (let i = 0; i < Math.min(k, samples.length); i++) {
        let idx
        do { idx = Math.floor(Math.random() * samples.length) } while (used.has(idx))
        used.add(idx)
        centroids.push(samples[idx].slice())
    }

    let assignments = new Array(samples.length).fill(0)
    for (let iter = 0; iter < iterations; iter++) {
        // assign
        for (let i = 0; i < samples.length; i++) {
            let best = 0, bestDist = Infinity
            for (let j = 0; j < centroids.length; j++) {
                const d = distanceRGB(samples[i], centroids[j])
                if (d < bestDist) { bestDist = d; best = j }
            }
            assignments[i] = best
        }
        // recompute centroids
        const sums = Array.from({ length: centroids.length }, () => [0,0,0])
        const counts = new Array(centroids.length).fill(0)
        for (let i = 0; i < samples.length; i++) {
            const a = assignments[i]
            sums[a][0] += samples[i][0]
            sums[a][1] += samples[i][1]
            sums[a][2] += samples[i][2]
            counts[a]++
        }
        for (let j = 0; j < centroids.length; j++) {
            if (counts[j] === 0) continue
            centroids[j][0] = sums[j][0] / counts[j]
            centroids[j][1] = sums[j][1] / counts[j]
            centroids[j][2] = sums[j][2] / counts[j]
        }
    }
    // produce clusters
    const clusters = centroids.map((c, idx) => ({ centroid: c, size: 0 }))
    for (let i = 0; i < assignments.length; i++) clusters[assignments[i]].size++
    return clusters
}

/**
 * composable: принимает ref на <img> элемент и вычисляет доминирующий цвет
 * возвращает { color } - реактивный hex
 */
export function useDominantColorFromImg(
    imgRef: { value: HTMLImageElement | null },
    opts: Options = {}
) {
    const {
        sampleSize = 900,
        k = 3,
        saturationThreshold = 0.15,
        lightnessIgnore = { min: 0.02, max: 0.98 },
        iterations = 8
    } = opts

    const color = ref<string>(FALLBACK)

    async function computeFromImg(img: HTMLImageElement) {
        if (!img || !img.src) {
            color.value = FALLBACK
            return
        }

        try {
            // wait a tick если нужно
            await nextTick()
            const w = img.naturalWidth || img.width
            const h = img.naturalHeight || img.height
            if (!w || !h) return

            // draw scaled down to keep sampleSize ~ sampleW*sampleH
            const ratio = Math.sqrt((w*h) / sampleSize)
            const sw = Math.max(1, Math.round(w / ratio))
            const sh = Math.max(1, Math.round(h / ratio))

            const canvas = document.createElement('canvas')
            canvas.width = sw
            canvas.height = sh
            const ctx = canvas.getContext('2d')
            if (!ctx) {
                color.value = FALLBACK
                return
            }

            ctx.drawImage(img, 0, 0, sw, sh)

            // try/catch for tainted canvas
            let imageData
            try {
                imageData = ctx.getImageData(0, 0, sw, sh).data
            } catch (e) {
                console.warn('Canvas is tainted (CORS). Add crossorigin and allow origin on the server.', e)
                color.value = FALLBACK
                return
            }

            const samples: number[][] = []
            for (let y = 0; y < sh; y++) {
                for (let x = 0; x < sw; x++) {
                    const idx = (y * sw + x) * 4
                    const r = imageData[idx], g = imageData[idx+1], b = imageData[idx+2], a = imageData[idx+3]
                    if (a === 0) continue // transparent
                    const { s, l } = rgbToHsl([r,g,b])
                    // ignore nearly white/black
                    if (l <= lightnessIgnore.min || l >= lightnessIgnore.max) continue
                    // filter low saturation (near gray)
                    if (s < saturationThreshold) continue
                    samples.push([r,g,b])
                }
            }

            // If nothing left after filtering, relax thresholds progressively
            let curSatThr = saturationThreshold
            let curLightMin = lightnessIgnore.min
            let curLightMax = lightnessIgnore.max
            while (samples.length < 8 && curSatThr > 0) {
                curSatThr = Math.max(0, curSatThr - 0.05)
                samples.length = 0
                for (let y = 0; y < sh; y++) {
                    for (let x = 0; x < sw; x++) {
                        const idx = (y * sw + x) * 4
                        const r = imageData[idx], g = imageData[idx+1], b = imageData[idx+2], a = imageData[idx+3]
                        if (a === 0) continue
                        const { s, l } = rgbToHsl([r,g,b])
                        if (l <= curLightMin || l >= curLightMax) continue
                        if (s < curSatThr) continue
                        samples.push([r,g,b])
                    }
                }
                // relax lightness bounds a bit too
                curLightMin = Math.max(0, curLightMin - 0.01)
                curLightMax = Math.min(1, curLightMax + 0.01)
                if (curSatThr === 0) break
            }

            // fallback: if still no samples — use all pixels
            if (samples.length === 0) {
                for (let i = 0; i < imageData.length; i += 4) {
                    const a = imageData[i+3]; if (a === 0) continue
                    samples.push([imageData[i], imageData[i+1], imageData[i+2]])
                }
            }

            // run k-means
            const clusters = kmeans(samples, Math.min(k, samples.length), iterations)
            if (!clusters || clusters.length === 0) {
                // fallback average
                const avg = [0,0,0]; let cnt = 0
                for (let i = 0; i < imageData.length; i += 4) {
                    const a = imageData[i+3]; if (a === 0) continue
                    avg[0] += imageData[i]; avg[1] += imageData[i+1]; avg[2] += imageData[i+2]; cnt++
                }
                if (cnt) { avg[0]/=cnt; avg[1]/=cnt; avg[2]/=cnt }
                color.value = rgbToHex(avg)
                return
            }

            // score clusters: size * (1 + saturation(centroid))
            const scored = clusters.map(c => {
                const sat = rgbToHsl(c.centroid).s
                return { centroid: c.centroid, size: c.size, score: c.size * (1 + sat) }
            })
            scored.sort((a,b) => b.score - a.score)
            const best = scored[0].centroid
            color.value = rgbToHex(best)
        } catch (err) {
            console.error('dominant color error', err)
            color.value = FALLBACK
        }
    }

    // attach to img load and watch
    onMounted(() => {
        const el = imgRef.value
        if (!el) return
        const handler = () => computeFromImg(el)
        el.addEventListener('load', handler)
        // If already loaded
        if (el.complete && el.naturalWidth) computeFromImg(el)
    })

    // if ref switch (new element), recompute
    watch(() => imgRef.value, (newEl, oldEl) => {
        if (oldEl) oldEl.removeEventListener('load', () => computeFromImg(oldEl))
        if (newEl) {
            newEl.addEventListener('load', () => computeFromImg(newEl))
            if (newEl.complete && newEl.naturalWidth) computeFromImg(newEl)
        }
    })

    watch(
        () => imgRef.value?.src,
        (newSrc) => {
            if (imgRef.value && newSrc) {
                if (imgRef.value.complete && imgRef.value.naturalWidth) {
                    computeFromImg(imgRef.value)
                } else {
                    imgRef.value.addEventListener('load', () => computeFromImg(imgRef.value!))
                }
            }
        }
    )

    return { color }
}
