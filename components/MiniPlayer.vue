<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { usePlayerStore } from '@/stores/player'
import { useLikesStore } from '@/stores/likes'
import type { TrackUI } from '@/types'

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
const onToggleLike = async (track: TrackUI | null) => {
  if (!track) return
  try {
    await likesStore.toggleLike({ id: track.id, type: 'track' })
  } catch (e) {
    console.error(e)
    toast.add({ title: 'Ошибка', description: 'Не удалось обновить лайк', color: 'error' })
  }
}

/* time/progress */
const formatTime = (seconds?: number) => {
  if (!seconds || isNaN(seconds)) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}
const progress = computed(() => duration.value > 0 ? (currentTime.value / duration.value) * 100 : 0)
const onSeek = (e: MouseEvent) => {
  const el = e.currentTarget as HTMLElement
  const rect = el.getBoundingClientRect()
  const percent = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1)
  player.seek(percent * duration.value)
}

/* ========== MOBILE STATES & GESTURES ========== */
/* panels: 0 = now, 1 = next, 2 = lyrics, 3 = similar */
const panels = ['now', 'next', 'lyrics', 'similar'] as const
const activeIndex = ref<number>(0) // текущая панель в fullscreen
const isFullscreen = ref(false)

/* mini -> swipe up to open fullscreen (existing) */
const miniTouching = ref(false)
const miniStartY = ref(0)
const miniDrag = ref(0)
const MINI_OPEN_THRESHOLD = 60

const onMiniTouchStart = (e: TouchEvent) => {
  miniTouching.value = true
  miniStartY.value = e.touches[0].clientY
  miniDrag.value = 0
}
const onMiniTouchMove = (e: TouchEvent) => {
  if (!miniTouching.value) return
  const cur = e.touches[0].clientY
  const d = miniStartY.value - cur // positive when moving up
  miniDrag.value = Math.max(0, d)
  if (miniDrag.value > 8 && e.cancelable) e.preventDefault()
}
const onMiniTouchEnd = () => {
  if (!miniTouching.value) return
  if (miniDrag.value >= MINI_OPEN_THRESHOLD) {
    isFullscreen.value = true
  }
  miniTouching.value = false
  miniDrag.value = 0
}

/* ---------- Fullscreen unified touch: horizontal (switch panels) + vertical (close) ---------- */
const fsTouching = ref(false)
const fsStartX = ref(0)
const fsStartY = ref(0)
const fsDragX = ref(0) // horizontal drag in px
const fsDragY = ref(0) // vertical drag in px
const fsMode = ref<null | 'horizontal' | 'vertical'>(null)
const FS_CLOSE_THRESHOLD = 80
const FS_HORIZONTAL_THRESHOLD = 0.2 // fraction of screen width to change panel

// перевод для whole fullscreen container (используется в :style)
const fsTranslateYpx = computed(() => fsDragY.value || 0)

// плавный переход контейнера (выключаем при таче)
const fsTransition = computed(() => (fsTouching.value && fsMode.value) ? 'none' : 'transform .22s ease')

// стиль мини-бар (когда свайпаешь мини вверх)
const miniTranslateStyle = computed(() =>
    miniTouching.value && miniDrag.value > 0
        ? { transform: `translateY(${-miniDrag.value}px)` }
        : {}
)


const onFsTouchStart = (e: TouchEvent) => {
  if (!isFullscreen.value) return
  fsTouching.value = true
  fsStartX.value = e.touches[0].clientX
  fsStartY.value = e.touches[0].clientY
  fsDragX.value = 0
  fsDragY.value = 0
  fsMode.value = null
}

const onFsTouchMove = (e: TouchEvent) => {
  if (!fsTouching.value) return
  const curX = e.touches[0].clientX
  const curY = e.touches[0].clientY
  const dx = curX - fsStartX.value
  const dy = curY - fsStartY.value

  // decide gesture mode
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
      // swipe left => next panel
      activeIndex.value = Math.min(activeIndex.value + 1, panels.length - 1)
    } else if (fsDragX.value >= thresholdPx) {
      // swipe right => prev panel
      activeIndex.value = Math.max(activeIndex.value - 1, 0)
    }
    fsDragX.value = 0
  } else if (fsMode.value === 'vertical') {
    if (fsDragY.value >= FS_CLOSE_THRESHOLD) {
      // закрываем
      isFullscreen.value = false
      activeIndex.value = 0
    }
    // сбрасываем drag (анимация вернёт обложку/контент)
    fsDragY.value = 0
  }

  fsTouching.value = false
  fsMode.value = null
}

/* ---------- Helpers to open panels (buttons) ---------- */
const indexOf = (which: 'next'|'lyrics'|'similar'|'now') => {
  switch (which) {
    case 'now': return 0
    case 'next': return 1
    case 'lyrics': return 2
    case 'similar': return 3
  }
}

const toggleContent = (which: 'next'|'lyrics'|'similar') => {
  const idx = indexOf(which)
  if (isFullscreen.value && activeIndex.value === idx) {
    activeIndex.value = 0
    return
  }
  activeIndex.value = idx
  isFullscreen.value = true
}

/* click/tap on mini-area: открываем fullscreen */
const onMiniClick = () => {
  isFullscreen.value = true
}

/* ---------- computed styles for slider + vertical translate ---------- */
const fsTranslatePercentVW = computed(() => {
  const base = -activeIndex.value * 100
  const extra = (typeof window !== 'undefined' && window.innerWidth)
      ? (fsDragX.value / window.innerWidth) * 100
      : 0
  return base + extra
})

/* ---------- Shared cover positioning & interpolation ---------- */
/* refs for measuring */
const miniCoverRef = ref<HTMLElement | null>(null)      // мини обложка в мини-панели
const sharedCoverRef = ref<HTMLElement | null>(null)    // единая обложка (абсолют)
let miniRect = null as DOMRect | null
let fullTarget = null as { cx: number, cy: number, size: number } | null

const sharedReady = ref(false)

const measureRects = () => {
  sharedReady.value = false
  miniRect = null
  if (!miniCoverRef.value) {
    return
  }

  // ждём layout - двойной RAF
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      if (!miniCoverRef.value) {
        miniRect = null
        return
      }
      miniRect = miniCoverRef.value.getBoundingClientRect()

      const vw = (typeof window !== 'undefined' && window.innerWidth) ? window.innerWidth : 360
      const vh = (typeof window !== 'undefined' && window.innerHeight) ? window.innerHeight : 800
      const targetSize = Math.min(Math.floor(vw * 0.7), 320)
      fullTarget = {
        cx: vw / 2,
        cy: Math.max(vh * 0.22, 80),
        size: targetSize
      }

      // для отладки: увидишь в консоли координаты
      // (убери или закомментируй потом)
      // eslint-disable-next-line no-console
      console.debug('measureRects -> miniRect', miniRect, 'fullTarget', fullTarget)

      sharedReady.value = !!miniRect && miniRect.width > 0 && miniRect.height > 0
    })
  })
}


onMounted(() => {
  nextTick(() => measureRects())
  window.addEventListener('resize', measureRects)
})
onUnmounted(() => window.removeEventListener('resize', measureRects))

// Перемеряем при смене трека или при открытии/закрытии fullscreen
watch([() => currentTrack?.value?.cover_url, isFullscreen], () => {
  // даём рендеру/загрузке картинок время
  setTimeout(() => measureRects(), 40)
})



/* distance / progress used for interpolation while dragging */
const CLOSE_ANIM_DISTANCE = 300 // px over which interpolation happens

const coverTransformStyle = computed(() => {
  const m = miniRect
  const target = fullTarget

  // если ничего не измерили - скрываем (без fallback в левом верхнем)
  if (!m || !target || !sharedReady.value) {
    return {
      display: 'none'
    }
  }

  // прогресс 0..1 при перетягивании вниз (fsDragY положителен)
  const progress = Math.min(Math.max(fsDragY.value / CLOSE_ANIM_DISTANCE, 0), 1)
  const isFs = isFullscreen.value

  // размеры: базовая мини-width m.width, цель - target.size
  const miniSize = m.width
  const fullSize = target.size

  // currentSize интерполируем между fullSize (при открыт) и miniSize (при закрыт)
  // когда открыт (isFs=true) и progress=0 => size=fullSize
  // когда тянем вниз (progress->1) => size -> miniSize
  const currentSize = isFs
      ? fullSize * (1 - progress) + miniSize * progress
      : miniSize * (1 - progress) + fullSize * progress

  // вычисляем центр, интерполируем между центром fullTarget и центром мини
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

  // вычисляем left/top так, чтобы элемент с размером currentSize был центрирован в cx/cy
  const leftPos = cx - currentSize / 2
  const topPos = cy - currentSize / 2

  // плавность: отключаем transition во время тача
  const transition = (fsTouching.value && fsMode.value) ? 'none' : 'left .22s ease, top .22s ease, width .22s ease, height .22s ease, opacity .18s ease'

  return {
    position: 'fixed',
    left: `${Math.round(leftPos)}px`,
    top: `${Math.round(topPos)}px`,
    width: `${Math.round(currentSize)}px`,
    height: `${Math.round(currentSize)}px`,
    transform: 'none',
    transition,
    willChange: 'left, top, width, height, opacity'
  }
})


/* opacity for "rest of content" - fade при drag */
const contentOpacity = computed(() => {
  const progress = Math.min(Math.max((fsDragY.value) / CLOSE_ANIM_DISTANCE, 0), 1)
  // если fullscreen открыт и не тянем => opacity 1
  // при тягивании вниз - уменьшаем
  return isFullscreen.value ? (1 - progress) : (1 - progress)
})

/* utils: re-measure on open so animation при открытии будет корректной */
watch(isFullscreen, async (val) => {
  await nextTick()
  measureRects()
})
</script>

<template>
  <div class="md:hidden ">
    <!-- MINI (мобильный) -->
    <div class="bg-black" :style="miniTranslateStyle">
      <div
          class="w-full px-3 py-2 flex items-center gap-3 shadow-lg transition-colors duration-150 bg-black text-white"
          @click="onMiniClick"
          @touchstart.passive="onMiniTouchStart"
          @touchmove="onMiniTouchMove"
          @touchend="onMiniTouchEnd"
          style="touch-action: none;"
      >
        <!-- cover -->
        <div
            ref="miniCoverRef"
            class="w-12 h-12 rounded overflow-hidden bg-old-neutral-700 flex-shrink-0 will-change-transform"
            :style="{ opacity: (isFullscreen || fsTouching.value || (sharedReady && isFullscreen)) ? 0 : 1, transition: 'opacity .18s ease' }"
        >
          <img
              v-if="currentTrack?.cover_url"
              :src="currentTrack.cover_url"
              class="w-full h-full object-cover"
              alt="cover"
              @load="measureRects"
          />
          <div v-else class="w-full h-full flex items-center justify-center text-old-neutral-400">♪</div>
        </div>

        <!-- title/author -->
        <div class="flex-1 min-w-0">
          <div class="text-sm font-medium truncate">{{ currentTrack?.title || '-' }}</div>
          <div class="text-xs text-old-neutral-300 truncate">
            <template v-if="currentTrack?.track_authors">
              <template v-for="(a, i) in currentTrack.track_authors" :key="a.author.id">
                {{ a.author.name }}<span v-if="i < currentTrack.track_authors.length - 1">, </span>
              </template>
            </template>
          </div>
        </div>
        <UButton icon="i-heroicons-backward"
                 variant="ghost"
                 class="text-old-neutral-400 hover:text-old-neutral-200 transition"
                 @click="player.playPrevious()"/>
        <UButton
            color="white"
            class="hover:scale-105 transition flex justify-center items-center bg-white text-old-neutral-900 w-10 h-10 rounded-full"
            @click="isPlaying ? player.pause() : player.resume()"
        >
          <UIcon :name="isPlaying ? 'i-heroicons-pause' : 'i-heroicons-play-solid'" class="w-5 h-5" />
        </UButton>
        <UButton icon="i-heroicons-forward"
                 class="text-old-neutral-400 hover:text-old-neutral-200 transition"
                 variant="ghost"
                 color="white"
                 @click="player.playNext()"/>
      </div>

      <!-- прогресс линия под мини (щелчок seek) -->
      <div class="w-full h-1 bg-old-neutral-800" @click="onSeek($event)">
        <div class="h-1 bg-green-500" :style="{ width: `${progress}%` }"></div>
      </div>
    </div>

    <!-- FULLSCREEN (мобильный) - только здесь слайдер панелей и свайпы -->
    <transition name="fade">
      <div
          v-if="isFullscreen"
          class="fixed min-h-screen inset-0 z-50 bg-black text-white md:hidden"
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
          <!-- header (минимальный) -->
          <div class="p-4 flex items-center justify-between">
            <div>
              <button @click="(() => { isFullscreen = false; activeIndex = 0 })()" class="p-2">✕</button>
            </div>
          </div>

          <!-- MAIN: cover + controls -->
          <div class="px-6 flex flex-col items-center">
            <div class="flex flex-col items-center gap-3">
              <!-- Cover -->
              <div class="h-48 relative flex justify-center items-center aspect-square group grow overflow-hidden rounded shadow-md mb-3">
                <UIcon
                    v-if="!currentTrack.cover_url"
                    name="i-heroicons-musical-note"
                    class="w-5 h-5 text-gray-400"
                />
                <img
                    v-else
                    :src="currentTrack.cover_url"
                    :alt="`Cover for ${currentTrack.title}`"
                    class="w-full object-cover rounded"
                >
              </div>

              <div>
                <div class="font-semibold">{{ currentTrack?.title }}</div>
                <div class="text-sm text-old-neutral-300 truncate max-w-[160px]">
                  <template v-if="currentTrack?.track_authors">
                    <template v-for="(a, i) in currentTrack.track_authors" :key="a.author.id">
                      {{ a.author.name }}<span v-if="i < currentTrack.track_authors.length - 1">, </span>
                    </template>
                  </template>
                </div>
              </div>
            </div>

            <div class="mt-4 flex items-center justify-center gap-6 mb-2">
              <UButton icon="i-heroicons-backward" variant="ghost" class="text-old-neutral-400 hover:text-old-neutral-200 transition" @click="player.playPrevious()"/>
              <UButton color="white" class="hover:scale-105 transition flex justify-center items-center bg-white text-old-neutral-900 w-12 h-12 rounded-full" @click="isPlaying ? player.pause() : player.resume()">
                <UIcon :name="isPlaying ? 'i-heroicons-pause' : 'i-heroicons-play-solid'" class="w-5 h-5" />
              </UButton>
              <UButton icon="i-heroicons-forward" class="text-old-neutral-400 hover:text-old-neutral-200 transition" variant="ghost" color="white" @click="player.playNext()"/>
            </div>

            <!-- Progress Bar -->
            <div class="flex items-center gap-2 text-xs w-full">
              <span class="w-10 text-right">{{ formatTime(currentTime) }}</span>
              <div class="flex-grow h-2 bg-old-neutral-700 rounded cursor-pointer relative" @click="onSeek">
                <div class="absolute top-0 left-0 h-full bg-green-500 rounded" :style="{ width: `${progress}%` }"/>
              </div>
              <span class="w-10">{{ formatTime(duration) }}</span>
            </div>

            <!-- ВАШИ КНОПКИ ПОД ПЛЕЕРОМ -->
            <div class="w-full mt-3 mb-2">
              <div class="flex gap-3">
                <button class="flex-1 py-3 text-sm font-medium" @click="toggleContent('next')">ДАЛЕЕ</button>
                <button class="flex-1 py-3 text-sm font-medium" @click="toggleContent('lyrics')">ТЕКСТ</button>
                <button class="flex-1 py-3 text-sm font-medium" @click="toggleContent('similar')">ПОХОЖЕЕ</button>
              </div>
            </div>
          </div>

          <!-- slider area (контент под кнопками) -->
          <div class="flex-1 overflow-hidden relative mt-2">
            <div
                class="absolute inset-0 flex h-full"
                :style="{
          transform: `translate3d(${fsTranslatePercentVW}vw, ${fsTranslateYpx}px, 0)`,
          transition: fsTransition
        }"
            >
              <!-- Panel 0: Now Playing (пустой/информационный блок) -->
              <div class="min-w-full p-6 flex flex-col">
                <div class="text-old-neutral-300">Now Playing - дополнительная информация о треке, связанные карточки и т.д.</div>
              </div>

              <!-- Panel 1: Next (queue) -->
              <div class="min-w-full p-6 overflow-y-auto">
                <div class="font-semibold mb-3">ДАЛЕЕ - Очередь</div>
                <div class="space-y-3">
                  <div class="p-3 bg-neutral-800 rounded">1. Заглушка трека - Исполнитель</div>
                  <div class="p-3 bg-neutral-800 rounded">2. Заглушка трека - Исполнитель</div>
                  <div class="p-3 bg-neutral-800 rounded">3. Заглушка трека - Исполнитель</div>
                </div>
              </div>

              <!-- Panel 2: Lyrics -->
              <div class="min-w-full p-6 overflow-y-auto">
                <div class="font-semibold mb-3">ТЕКСТ</div>
                <div class="prose prose-invert max-w-none text-old-neutral-300">
                  <p>Текст трека (lyrics) - прокручиваемая область.</p>
                </div>
              </div>

              <!-- Panel 3: Similar -->
              <div class="min-w-full p-6 overflow-y-auto">
                <div class="font-semibold mb-3">ПОХОЖЕЕ</div>
                <div class="space-y-3">
                  <div class="p-3 bg-neutral-800 rounded">Похожий трек 1 - Исполнитель</div>
                  <div class="p-3 bg-neutral-800 rounded">Похожий трек 2 - Исполнитель</div>
                  <div class="p-3 bg-neutral-800 rounded">Похожий трек 3 - Исполнитель</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </transition>
    <!-- Shared absolute cover (единственная копия обложки) -->
    <div
        ref="sharedCoverRef"
        class="fixed pointer-events-none z-60 rounded overflow-hidden"
        :style="[
          coverTransformStyle,
          {
            display: sharedReady ? undefined : 'none',
            opacity: sharedReady ? 1 : 0,
            // если тач активен - отключаем transition, чтобы не дергало
            transition: (fsTouching.value || !sharedReady.value) ? 'none' : 'transform .22s ease, opacity .18s ease'
          }
        ]"
    >
      <img
          v-if="currentTrack?.cover_url"
          :src="currentTrack.cover_url"
          class="w-full h-full object-cover"
          alt="cover"
          @load="measureRects"
      />
      <div v-else class="w-full h-full flex items-center justify-center text-old-neutral-400">♪</div>
    </div>

  </div>

  <div class="hidden md:flex flex-row justify-between bg-black text-white p-3 shadow-lg backdrop-blur">
    <!-- Track Info -->
    <div class="flex justify-self-start items-center gap-3">
      <div class="w-12 h-12 bg-old-neutral-800 flex items-center justify-center overflow-hidden rounded">
        <img
            v-if="currentTrack?.cover_url"
            :src="currentTrack.cover_url"
            class="w-12 h-12 object-cover"
            alt="Cover"
        >
        <UIcon v-else name="i-heroicons-musical-note" class="text-old-neutral-400"/>
      </div>
      <div class="flex flex-col">
        <div class="font-semibold truncate max-w-[360px]">{{ currentTrack?.title }}</div>
        <div v-if="currentTrack?.track_authors"
             class="flex flex-row text-sm text-old-neutral-400 truncate max-w-[360px] overflow-hidden">
          <div class="truncate whitespace-nowrap overflow-hidden">
              <span
                  v-for="(author, index) in currentTrack.track_authors"
                  :key="author.author.id"
              >
              <NuxtLink
                  :to="`/authors/${author.author.id}`"
                  class="text-sm text-old-neutral-400 hover:underline"
              >
                {{ author.author.name || 'Unknown Artist' }}
              </NuxtLink>
              <span v-if="index < currentTrack.track_authors.length - 1">,&nbsp;</span>
            </span>
          </div>
        </div>
      </div>
      <button
          :disabled="!!likesStore.pending[currentTrack.id]"
          class="p-2"
          :title="likesStore.isLiked(currentTrack.id) ? 'Unlike' : 'Like'"
          @click="onToggleLike(currentTrack)"
      >
        <UIcon
            :name="likesStore.isLiked(currentTrack.id) ? 'i-heroicons-heart-solid' : 'i-heroicons-heart'"
            :class="likesStore.isLiked(currentTrack.id) ? 'text-red-500' : 'text-black'"
            class="w-6 h-6"
        />
      </button>
    </div>
    <div class="max-w-6xl flex flex-col justify-self-center gap-2">
      <!-- Top Row: Controls -->
      <div class="flex justify-center items-center">
        <!-- Controls -->
        <div class="flex self-center items-center gap-4">
          <UIcon
              name="ph:shuffle"
              variant="ghost"
              color="white"
              class="w-4.5 h-4.5 text-old-neutral-400 hover:text-old-neutral-200 transition"
              :class="{ 'text-green-500': isShuffle }"
              @click="player.toggleShuffle()"
          />
          <UButton icon="i-heroicons-backward"
                   variant="ghost"
                   class="text-old-neutral-400 hover:text-old-neutral-200 transition"
                   @click="player.playPrevious()"/>
          <UButton
              color="white"
              class="hover:scale-105 transition flex justify-center items-center bg-white text-old-neutral-900 w-10 h-10 rounded-full"
              @click="isPlaying ? player.pause() : player.resume()"
          >
            <UIcon
                :name="isPlaying ? 'i-heroicons-pause' : 'i-heroicons-play-solid'"
                class="w-5 h-5"
            />
          </UButton>
          <UButton icon="i-heroicons-forward"
                   class="text-old-neutral-400 hover:text-old-neutral-200 transition"
                   variant="ghost"
                   color="white"
                   @click="player.playNext()"/>
          <UIcon
              name="i-heroicons-arrow-path"
              class="w-4.5 h-4.5 text-old-neutral-400 hover:text-old-neutral-200 transition"
              :class="{ 'text-green-500': isRepeat }"
              @click="player.toggleRepeat()"
          />
        </div>
      </div>

      <!-- Progress Bar -->
      <div class="flex items-center gap-2 text-xs min-w-xl">
        <span class="w-10 text-right">{{ formatTime(currentTime) }}</span>
        <div class="flex-grow h-2 bg-old-neutral-700 rounded cursor-pointer relative" @click="onSeek">
          <div class="absolute top-0 left-0 h-full bg-green-500 rounded" :style="{ width: `${progress}%` }"/>
        </div>
        <span class="w-10">{{ formatTime(duration) }}</span>
      </div>
    </div>

    <div class="flex items-center justify-self-end">
      <!-- Buttons -->
      <UButton
          icon="i-heroicons-chevron-up"
          size="lg"
          variant="ghost"
          color="white"
          @click="player.isViewOpen('now') ? player.closeView('now') : player.openView('now')"
      />

      <UButton
          icon="i-heroicons-microphone"
          size="lg"
          variant="ghost"
          color="white"
          @click="player.isViewOpen('lyrics') ? player.closeView('lyrics') : player.openView('lyrics')"
      />

      <UButton
          icon="i-heroicons-queue-list"
          size="lg"
          variant="ghost"
          color="white"
          @click="player.isViewOpen('queue') ? player.closeView('queue') : player.openView('queue')"
      />

      <!-- Volume -->
      <div class="flex items-center gap-2 w-24">
        <UIcon
            :name="volume > 0 && !isMuted ? 'i-heroicons-speaker-wave' : 'i-heroicons-speaker-x-mark'"
            class="w-5 h-5"
            @click="toggleMute"
        />
        <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            :value="volume"
            class="volume-range w-full"
            @input="player.setVolume($event.target.valueAsNumber); isMuted = $event.target.valueAsNumber === 0"
        >
      </div>
    </div>
  </div>
</template>

<style scoped>
.slide-up-enter-active { transition: transform .25s ease, opacity .18s ease; }
.slide-up-enter-from { transform: translateY(100%); opacity: 0; }
.slide-up-enter-to { transform: translateY(0); opacity: 1; }

.fade-enter-active, .fade-leave-active { transition: opacity .18s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.md\\:hidden .w-full.px-3.py-2 {
  border-top-left-radius: 10px;
  border-top-right-radius: 10px;
}

.volume-range {
  width: 100%;
  height: 8px;
  color: #424242;
  cursor: pointer;
}

/* стиль для общей обложки (shared) */
.fixed.pointer-events-none.z-60 {

}
.shared-cover {
  transform-origin: center center;
  border-radius: 12px;
  overflow: hidden;
}

</style>
