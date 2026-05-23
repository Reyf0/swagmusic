<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { usePlayerStore } from '@/stores/player'
import { useLikesStore } from '@/stores/likes'
import { useSpring } from '@vueuse/motion'
import { Hero } from 'hero-motion'

const player = usePlayerStore()
const likesStore = useLikesStore()
likesStore.attachPlayerStore?.(player)

const {
  currentTrack,
  isPlaying,
  currentTime,
  duration,
  volume,
  isRepeat,
  isShuffle
} = storeToRefs(player)

const toast = useToast()

/* desktop mute logic kept */
const isMuted = ref(false)
const recentVolume = ref(0)
const toggleMute = () => {
  if (isMuted.value) {
    player.setVolume(recentVolume.value || 0.5)
  } else {
    recentVolume.value = volume.value
    player.setVolume(0)
  }
  isMuted.value = !isMuted.value
}

/* likes */
const onToggleLike = async (track) => {
  if (!track) return
  try {
    await likesStore.toggleLike({ id: track.id, type: 'track' })
  } catch (e) {
    console.error(e)
    toast.add({ title: 'Ошибка', description: 'Не удалось обновить лайк', color: 'error' })
  }
}

/* time/progress */
const formatTime = (seconds) => {
  if (!seconds || isNaN(seconds)) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}
const progress = computed(() => duration.value > 0 ? (currentTime.value / duration.value) * 100 : 0)
const onSeek = (e) => {
  const el = e.currentTarget
  const rect = el.getBoundingClientRect()
  const percent = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1)
  player.seek(percent * duration.value)
}

/* ========== MOBILE STATES & GESTURES ========== */
const panels = ['now', 'next', 'lyrics', 'similar'] as const
const activeIndex = ref(0)
const isFullscreen = ref(false)

/* mini -> swipe up to open fullscreen */
const miniTouching = ref(false)
const miniStartY = ref(0)
const miniDrag = ref(0)
const MINI_OPEN_THRESHOLD = 60

const onMiniTouchStart = (e) => {
  miniTouching.value = true
  miniStartY.value = e.touches[0].clientY
  miniDrag.value = 0
}
const onMiniTouchMove = (e) => {
  if (!miniTouching.value) return
  const cur = e.touches[0].clientY
  const d = miniStartY.value - cur
  miniDrag.value = Math.max(0, d)
  if (miniDrag.value > 8 && e.cancelable) e.preventDefault()
}
const onMiniTouchEnd = () => {
  if (!miniTouching.value) return
  if (miniDrag.value >= MINI_OPEN_THRESHOLD) {
    isFullscreen.value = true
    fsJustOpened.value = true
    setTimeout(() => fsJustOpened.value = false, 250)
  }
  miniTouching.value = false
  miniDrag.value = 0
}

/* Fullscreen touch */
const fsTouching = ref(false)
const fsStartX = ref(0)
const fsStartY = ref(0)
const fsDragX = ref(0)
const fsDragY = ref(0)
const fsMode = ref(null)
const FS_CLOSE_THRESHOLD = 80
const FS_HORIZONTAL_THRESHOLD = 0.2
const fsJustOpened = ref(false)

const fsTranslateYpx = computed(() =>
    fsTouching.value && fsMode.value === 'vertical'
        ? fsDragY.value
        : 0
)
const fsTransition = computed(() => (fsTouching.value && fsMode.value) ? 'none' : 'transform .22s ease')

const miniTranslateStyle = computed(() =>
    miniTouching.value && miniDrag.value > 0
        ? { transform: `translateY(${-miniDrag.value}px)` }
        : {}
)

const onFsTouchStart = (e) => {
  if (!isFullscreen.value) return
  if (fsJustOpened.value) return
  fsTouching.value = true
  fsStartX.value = e.touches[0].clientX
  fsStartY.value = e.touches[0].clientY
  fsDragX.value = 0
  fsDragY.value = 0
  fsMode.value = null
}

const onFsTouchMove = (e) => {
  if (!fsTouching.value) return
  const curX = e.touches[0].clientX
  const curY = e.touches[0].clientY
  const dx = curX - fsStartX.value
  const dy = curY - fsStartY.value

  if (fsMode.value === null) {
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 6) {
      fsMode.value = 'horizontal'
    } else if (Math.abs(dy) > 6) {
      fsMode.value = 'vertical'
    } else {
      fsMode.value = null
    }
  }

  if (fsMode.value === 'horizontal') {
    fsDragX.value = dx
    if (e.cancelable) e.preventDefault()
  } else if (fsMode.value === 'vertical') {
    fsDragY.value = dy
    if (Math.abs(fsDragY.value) > 8 && e.cancelable) e.preventDefault()
  }
}

const onFsTouchEnd = () => {
  if (!fsTouching.value) return

  if (fsMode.value === 'horizontal') {
    const screenW = (typeof window !== 'undefined' && window.innerWidth) ? window.innerWidth : 360
    const thresholdPx = Math.max(60, screenW * FS_HORIZONTAL_THRESHOLD)
    if (fsDragX.value <= -thresholdPx) {
      activeIndex.value = Math.min(activeIndex.value + 1, panels.length - 1)
    } else if (fsDragX.value >= thresholdPx) {
      activeIndex.value = Math.max(activeIndex.value - 1, 0)
    }
    fsDragX.value = 0
  } else if (fsMode.value === 'vertical') {
    if (fsDragY.value >= FS_CLOSE_THRESHOLD) {
      isFullscreen.value = false
      activeIndex.value = 0
    }
    fsDragY.value = 0
  }

  fsTouching.value = false
  fsMode.value = null
}

/* helpers */
const indexOf = (which) => {
  switch (which) {
    case 'now': return 0
    case 'next': return 1
    case 'lyrics': return 2
    case 'similar': return 3
  }
}
const toggleContent = (which) => {
  const idx = indexOf(which)
  if (isFullscreen.value && activeIndex.value === idx) {
    activeIndex.value = 0
    return
  }
  activeIndex.value = idx
  isFullscreen.value = true
  fsJustOpened.value = true
  setTimeout(() => fsJustOpened.value = false, 250)
}
const onMiniClick = () => {
  isFullscreen.value = true
  fsJustOpened.value = true
  setTimeout(() => fsJustOpened.value = false, 250)
}

/* ---------- SMOOTHING (useSpring) ---------- */
const miniProgressRaw = ref(0)
const miniSpring = useSpring(miniProgressRaw, { stiffness: 200, damping: 28 })
watch([miniDrag], () => {
  const reveal = 220
  miniProgressRaw.value = Math.min(1, Math.max(0, miniDrag.value / reveal))
})

const fsDragYSpring = useSpring(fsDragY, { stiffness: 220, damping: 28 })

/* ---------- Shared cover positioning & interpolation ---------- */
const miniCoverRef = ref(null)
const sharedCoverRef = ref(null)
let miniRect = null
let fullTarget = null
const sharedReady = ref(false)

const measureRects = () => {
  sharedReady.value = false
  miniRect = null
  if (!miniCoverRef.value) return
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      if (!miniCoverRef.value) { miniRect = null; return }
      miniRect = miniCoverRef.value.getBoundingClientRect()
      const vw = (typeof window !== 'undefined' && window.innerWidth) ? window.innerWidth : 360
      const vh = (typeof window !== 'undefined' && window.innerHeight) ? window.innerHeight : 800
      const targetSize = Math.min(Math.floor(vw * 0.7), 320)
      fullTarget = {
        cx: vw / 2,
        cy: Math.max(vh * 0.22, 80),
        size: targetSize
      }
      sharedReady.value = !!miniRect && miniRect.width > 0 && miniRect.height > 0
    })
  })
}

onMounted(() => {
  nextTick(() => measureRects())
  window.addEventListener('resize', measureRects, { passive: false })
})
onUnmounted(() => window.removeEventListener('resize', measureRects))

watch([() => currentTrack?.value?.cover_url, isFullscreen], () => {
  setTimeout(() => measureRects(), 40)
})

const CLOSE_ANIM_DISTANCE = 300

/* compute cover transform values (numbers) */
const coverTransform = computed(() => {
  const m = miniRect
  const target = fullTarget
  if (!m || !target || !sharedReady.value) {
    return { left: 0, top: 0, width: 0, height: 0, opacity: 0, transitionDisabled: true }
  }

  const rawProgress = Math.min(Math.max(fsDragY.value / CLOSE_ANIM_DISTANCE, 0), 1)
  const progress = rawProgress

  const miniSize = m.width
  const fullSize = target.size
  const isFs = isFullscreen.value

  const currentSize = isFs
      ? fullSize * (1 - progress) + miniSize * progress
      : miniSize * (1 - progress) + fullSize * progress

  const miniCenterX = m.left + m.width / 2
  const miniCenterY = m.top + m.height / 2
  const targetCenterX = target.cx
  const targetCenterY = target.cy + (fsTouching.value ? fsDragY.value : 0)

  const cx = isFs
      ? targetCenterX * (1 - progress) + miniCenterX * progress
      : miniCenterX * (1 - progress) + targetCenterX * progress

  const cy = isFs
      ? targetCenterY * (1 - progress) + miniCenterY * progress
      : miniCenterY * (1 - progress) + targetCenterY * progress

  const leftPos = cx - currentSize / 2
  const topPos = cy - currentSize / 2

  return {
    left: Math.round(leftPos),
    top: Math.round(topPos),
    width: Math.round(currentSize),
    height: Math.round(currentSize),
    opacity: sharedReady.value ? 1 : 0,
    transitionDisabled: fsTouching.value || !sharedReady.value
  }
})

/* content opacity from springed fsDragY (returns number 0..1) */
const contentOpacity = computed(() => {
  if (!fsTouching.value) return 1
  const p = Math.min(Math.max(fsDragYSpring.value / CLOSE_ANIM_DISTANCE, 0), 1)
  return 1 - p
})

/* ------------ MISSING computed fixed: fsTranslatePercentVW and safe fsDragYSpringValue ------------- */
const fsTranslatePercentVW = computed(() => {
  const base = -activeIndex.value * 100
  const extra = (typeof window !== 'undefined' && window.innerWidth)
      ? (fsDragX.value / window.innerWidth) * 100
      : 0
  return base + extra
})
// safe numeric unwrap for the spring (used in template)
const fsDragYSpringValue = computed(() => Number(fsDragYSpring.value || 0))
</script>

<template>
  <div class="md:hidden">
    <!-- MINI (mobile) -->
    <div class="bg-black" :style="miniTranslateStyle">
      <div
          class="w-full px-3 py-2 flex items-center gap-3 shadow-lg transition-colors duration-150 bg-black text-white touch-none select-none"
          @click="onMiniClick"
          @touchstart.passive="onMiniTouchStart"
          @touchmove="onMiniTouchMove"
          @touchend="onMiniTouchEnd"
          style="touch-action: none;"
      >
        <!-- cover -->
        <div
            ref="miniCoverRef"
            class="w-12 h-12 rounded overflow-hidden bg-slate-700 flex-shrink-0 will-change-transform"
            :style="{ opacity: (isFullscreen || fsTouching.value || (sharedReady && isFullscreen)) ? 0 : 1, transition: 'opacity .18s ease' }"
        >
          <img
              v-if="currentTrack?.cover_url"
              :src="currentTrack.cover_url"
              class="w-full h-full object-cover"
              alt="cover"
              @load="measureRects"
          />
          <div v-else class="w-full h-full flex items-center justify-center text-slate-400">♪</div>
        </div>

        <!-- title/author -->
        <div class="flex-1 min-w-0">
          <div class="text-sm font-medium truncate">{{ currentTrack?.title || '-' }}</div>
          <div class="text-xs text-slate-400 truncate">
            <template v-if="currentTrack?.track_authors">
              <template v-for="(a, i) in currentTrack.track_authors" :key="a.author.id">
                {{ a.author.name }}<span v-if="i < currentTrack.track_authors.length - 1">, </span>
              </template>
            </template>
          </div>
        </div>

        <!-- controls -->
        <button @click.stop="player.playPrevious()" class="p-2 text-slate-300 hover:text-white">◄</button>
        <button
            @click.stop="isPlaying ? player.pause() : player.resume()"
            class="bg-white text-black w-10 h-10 rounded-full flex items-center justify-center"
        >
          <i :class="isPlaying ? 'icon-pause' : 'icon-play'"></i>
        </button>
        <button @click.stop="player.playNext()" class="p-2 text-slate-300 hover:text-white">►</button>
      </div>

      <!-- progress -->
      <div class="w-full h-1 bg-slate-800" @click="onSeek($event)">
        <div class="h-1 bg-green-500" :style="{ width: `${progress}%` }"></div>
      </div>
    </div>

    <!-- FULLSCREEN -->
    <transition name="fade">
      <motion
          v-if="isFullscreen"
          :initial="{ opacity: 0, y: 18 }"
          :animate="{ opacity: contentOpacity, y: fsDragYSpringValue * 0.06 }"
          transition="{ type: 'spring', stiffness: 160, damping: 20 }"
      >
        <div
            class="fixed inset-0 z-50 bg-black text-white md:hidden"
            @touchstart="onFsTouchStart"
            @touchmove="onFsTouchMove"
            @touchend="onFsTouchEnd"
            :style="{
            touchAction: 'none',
            transform: `translateY(${fsTranslateYpx}px)`,
            transition: fsTransition,
            backgroundColor: `rgba(0,0,0,${1 - Math.min(fsTranslateYpx/300, 0.7)})`
          }"
        >
          <div :style="{ opacity: contentOpacity }" class="h-full flex flex-col">
            <div class="p-4 flex items-center justify-between">
              <div>
                <button @click="(() => { isFullscreen = false; activeIndex = 0 })()" class="p-2">✕</button>
              </div>
            </div>

            <!-- MAIN -->
            <div class="px-6 flex flex-col items-center">
              <div class="mt-2 text-center">
                <div class="font-semibold text-lg">{{ currentTrack?.title }}</div>
                <div class="text-sm text-slate-300 truncate max-w-[160px]">
                  <template v-if="currentTrack?.track_authors">
                    <template v-for="(a, i) in currentTrack.track_authors" :key="a.author.id">
                      {{ a.author.name }}<span v-if="i < currentTrack.track_authors.length - 1">, </span>
                    </template>
                  </template>
                </div>
              </div>

              <div class="mt-4 flex items-center justify-center gap-6 mb-2">
                <button @click="player.playPrevious()" class="text-slate-300">◄</button>
                <button @click="isPlaying ? player.pause() : player.resume()" class="bg-white text-black w-12 h-12 rounded-full flex items-center justify-center">
                  <i :class="isPlaying ? 'icon-pause' : 'icon-play'"></i>
                </button>
                <button @click="player.playNext()" class="text-slate-300">►</button>
              </div>

              <!-- progress -->
              <div class="flex items-center gap-2 text-xs w-full">
                <span class="w-10 text-right">{{ formatTime(currentTime) }}</span>
                <div class="flex-grow h-2 bg-slate-700 rounded cursor-pointer relative" @click="onSeek">
                  <div class="absolute top-0 left-0 h-full bg-green-500 rounded" :style="{ width: `${progress}%` }"/>
                </div>
                <span class="w-10">{{ formatTime(duration) }}</span>
              </div>

              <div class="w-full mt-3 mb-2">
                <div class="flex gap-3">
                  <button class="flex-1 py-3 text-sm font-medium" @click="toggleContent('next')">ДАЛЕЕ</button>
                  <button class="flex-1 py-3 text-sm font-medium" @click="toggleContent('lyrics')">ТЕКСТ</button>
                  <button class="flex-1 py-3 text-sm font-medium" @click="toggleContent('similar')">ПОХОЖЕЕ</button>
                </div>
              </div>
            </div>

            <!-- slider area -->
            <div class="flex-1 overflow-hidden relative mt-2">
              <div
                  class="absolute inset-0 flex h-full"
                  :style="{
                  transform: `translate3d(${fsTranslatePercentVW}vw, ${fsTranslateYpx}px, 0)`,
                  transition: fsTransition
                }"
              >
                <div class="min-w-full p-6 flex flex-col">Now Playing - additional</div>
                <div class="min-w-full p-6 overflow-y-auto">Queue</div>
                <div class="min-w-full p-6 overflow-y-auto">Lyrics</div>
                <div class="min-w-full p-6 overflow-y-auto">Similar</div>
              </div>
            </div>
          </div>
        </div>
      </motion>
    </transition>

    <!-- Shared absolute cover -->
    <div
        ref="sharedCoverRef"
        class="fixed pointer-events-none z-60 rounded overflow-hidden"
        v-if="sharedReady"
        v-motion
        :initial="{ opacity: 0 }"
        :animate="{
        opacity: coverTransform.opacity,
        left: coverTransform.left,
        top: coverTransform.top,
        width: coverTransform.width,
        height: coverTransform.height
      }"
        :transition="coverTransform.transitionDisabled ? { duration: 0 } : { type: 'spring', stiffness: 220, damping: 28 }"
        :style="{ display: sharedReady ? undefined : 'none', transformOrigin: 'center center' }"
    >
      <img
          v-if="currentTrack?.cover_url"
          :src="currentTrack.cover_url"
          class="w-full h-full object-cover"
          alt="cover"
          @load="measureRects"
      />
      <div v-else class="w-full h-full flex items-center justify-center text-slate-400">♪</div>
    </div>
  </div>

  <!-- Desktop (оставлено без изменений) -->
  <div class="hidden md:flex flex-row justify-between bg-black text-white p-3 shadow-lg backdrop-blur">
    <!-- desktop markup (твой оригинал) -->
  </div>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity .18s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
