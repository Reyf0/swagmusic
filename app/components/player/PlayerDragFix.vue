<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, onBeforeMount, watch } from 'vue'
import { animate } from 'motion'
import { usePlayerStore } from "@/stores/player";
import { useLikesStore } from "@/stores/likes";
import { storeToRefs } from "pinia";
import type { TrackUI } from "#shared/types";


const player = usePlayerStore()
const likesStore = useLikesStore()
likesStore.attachPlayerStore?.(player)
const tracksStore = useTracksStore()

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

/* --------------- базовые переменные --------------- */
const closedVisibleHeight = 84
let windowH = window.innerHeight
let closedOffset = windowH - closedVisibleHeight
let windowW = window.innerWidth

let currentAnim: Animation | null = null

const sheet = ref<HTMLElement | null>(null)
const content = ref<HTMLElement | null>(null)

const offset = ref(closedOffset)
const dragging = ref(false)
const startY = ref(0)
const startOffset = ref(0)
const lastPointerTime = ref(0)
const lastPointerY = ref(0)
const pointerVelocity = ref(0)
const lastPointerId = ref<number | null>(null)

const DEADZONE_PX = 6
const DEADZONE_V = 0.02
const CLOSING_THRESHOLD = 0.5

const MINI_SIZE = 48
const BIG_COVER_SIZE = 100 // 100 %

function clamp(v:number, a:number, b:number){ return Math.max(a, Math.min(b, v)) }

const overlayActive = computed(() => offset.value !== closedOffset)

const progress = computed(() => clamp(1 - offset.value / closedOffset, 0, 1))

const sheetStyle = computed(() => ({
  transform: `translateY(${offset.value}px)`,
  touchAction: 'none',
  WebkitUserSelect: 'none',
  userSelect: 'none',
  overscrollBehavior: 'contain',
  height: '100vh',
}))

const coverStyle = computed(() => ({
  width: `${BIG_COVER_SIZE}%`,
  height: `${BIG_COVER_SIZE}%`,
  transition: dragging.value ? 'none' : 'opacity .18s',
  opacity: progress.value,
  marginLeft: 'auto',
  marginRight: 'auto',
}))

/* --------------- helper --------------- */
function getComputedTranslateY(el?: HTMLElement | null): number {
  if (!el) return 0
  const cs = getComputedStyle(el)
  const transform = cs.transform || cs.webkitTransform || 'none'
  if (transform === 'none') return 0

  // transform: matrix(a, b, c, d, tx, ty)  или matrix3d(...)
  const m = transform.match(/matrix.*\((.+)\)/)
  if (!m) return 0
  const values = m[1].split(',').map(v => parseFloat(v.trim()))
  // для 2D matrix: tx = values[4], ty = values[5]
  if (values.length >= 6) return values[5]
  // для 3d: ty находится в позиции 13
  if (values.length === 16) return values[13]
  return 0
}

function measureWindowAndSub() {
  windowH = window.innerHeight
  subHeightPx = windowH * SUB_HEIGHT_RATIO
  closedSubOffset = Math.max(0, subHeightPx - SUB_VISIBLE_PX)
  // если baseSubOffset выходит за новые границы — скорректируем
  baseSubOffset.value = Math.min(baseSubOffset.value, closedSubOffset)
}

function measureTopPanel() {
  if (!topPanel.value) {
    topPanelHeight.value = 0
    return
  }
  topPanelHeight.value = Math.round(topPanel.value.getBoundingClientRect().height)
}


/* --------------- main sheet handlers --------------- */
/* onPointerDown игнорирует клики/drag внутри subSheet или когда sub частично открыт */
function onPointerDown(e: PointerEvent) {
  e.preventDefault?.()

  // если subSheet существует и event пришёлся внутрь него — не начинаем drag главного
  if (subSheet.value) {
    const t = (e.target as Node) || null
    if (t && subSheet.value.contains(t)) return
    // также не даём перетягивать главный лист, если sub хоть немного открыт
    if (baseSubOffset.value < closedSubOffset) return
  }

  if (currentAnim) return

  lastPointerId.value = e.pointerId
  try { sheet.value?.setPointerCapture?.(e.pointerId) } catch {}

  pointerVelocity.value = 0
  dragging.value = true
  startY.value = e.clientY
  startOffset.value = offset.value
  lastPointerTime.value = performance.now()
  lastPointerY.value = e.clientY

  window.addEventListener('pointermove', onPointerMove, { passive: false })
  window.addEventListener('pointerup', onPointerUp)
}

function onPointerMove(e: PointerEvent) {
  // если сейчас драг sub — главный не должен двигаться
  if (draggingSub.value) return

  e.preventDefault()
  const now = performance.now()
  const dt = Math.max(1, now - lastPointerTime.value)

  const totalDy = e.clientY - startY.value
  if (Math.abs(totalDy) < DEADZONE_PX) {
    lastPointerTime.value = now
    lastPointerY.value = e.clientY
    if (sheet.value) sheet.value.style.transform = `translateY(${offset.value}px)`
    return
  }

  const dy = e.clientY - lastPointerY.value
  const instV = dy / dt
  pointerVelocity.value = pointerVelocity.value * 0.2 + instV * 0.8
  lastPointerTime.value = now
  lastPointerY.value = e.clientY

  const delta = e.clientY - startY.value
  let newOffset = startOffset.value + delta
  newOffset = clamp(newOffset, 0, closedOffset)
  offset.value = newOffset
  if (sheet.value) sheet.value.style.transform = `translateY(${offset.value}px)`
}

function runAnimation(from: string, to: string, target: number) {
  if (currentAnim) { try { currentAnim.cancel() } catch {} currentAnim = null }
  if (sheet.value) sheet.value.style.pointerEvents = 'none'
  currentAnim = animate(sheet.value, { translateY: [from, to] }, { type: 'spring', stiffness: 160, damping: 22 })
  currentAnim.finished
      .then(() => { offset.value = target; currentAnim = null; if (sheet.value) sheet.value.style.pointerEvents = '' })
      .catch(() => { offset.value = target; currentAnim = null; if (sheet.value) sheet.value.style.pointerEvents = '' })
}

function onPointerUp(e: PointerEvent) {
  dragging.value = false
  try { if (lastPointerId.value != null) sheet.value?.releasePointerCapture?.(lastPointerId.value) } catch {}
  lastPointerId.value = null

  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)

  let v = pointerVelocity.value
  const totalDy = e.clientY - startY.value
  if (Math.abs(totalDy) < DEADZONE_PX) v = 0
  if (Math.abs(v) < DEADZONE_V) v = 0

  const velocityInfluence = v * 300
  const predicted = offset.value + velocityInfluence
  const shouldOpen = predicted < closedOffset * CLOSING_THRESHOLD
  const target = shouldOpen ? 0 : closedOffset

  const from = `${offset.value}px`
  const to = `${target}px`

  if (sheet.value) runAnimation(from, to, target)
  else offset.value = target
}

/* --------------- subSheet (нижняя панель) --------------- */
const SUB_HEIGHT_RATIO = 0.9
const SUB_VISIBLE_PX = 88

let subHeightPx = windowH * SUB_HEIGHT_RATIO
let closedSubOffset = Math.max(0, subHeightPx - SUB_VISIBLE_PX)

const subSheet = ref<HTMLElement | null>(null)
const baseSubOffset = ref(closedSubOffset)


// drag state
const draggingSub = ref(false)
const startYSub = ref(0)
const startOffsetSub = ref(0)
const lastPointerTimeSub = ref(0)
const lastPointerYSub = ref(0)
const pointerVelocitySub = ref(0)
const lastPointerIdSub = ref<number | null>(null)
let currentSubAnim: Animation | null = null

const topPanel = ref<HTMLElement | null>(null)
const topPanelHeight = ref(0)

const subProgress = computed(() => {
  if (closedSubOffset <= 0) return 1
  return clamp(1 - baseSubOffset.value / closedSubOffset, 0, 1)
})

const subStyle = computed(() => ({
  position: 'absolute',
  left: '0',
  right: '0',
  bottom: '0',
  height: `${Math.round(subHeightPx)}px`,
  transform: `translateY(${baseSubOffset.value}px)`,
  touchAction: 'none',
  WebkitUserSelect: 'none',
  userSelect: 'none',
  transition: draggingSub.value ? 'none' : undefined,
  background: 'var(--bg-sub, var(--tw-bg-white))',
  borderTopLeftRadius: '1rem',
  borderTopRightRadius: '1rem',
  boxShadow: '0 -8px 30px rgba(2,6,23,0.12)',
  overflow: 'hidden',
  zIndex: 60,
}))

/* --- Важно: drag sub запускается ТОЛЬКО с ручки (handle) ---
   поэтому onSubPointerDown навешивается *на ручку*, а не на весь контейнер. */
function onSubPointerDown(e: PointerEvent) {
  // разрешаем открывать/перетягивать sub только когда главный лист полностью открыт
  if (offset.value !== 0) return
  cancelAnyAnimations()

  // УБРАЛИ e.stopPropagation() и e.preventDefault(), чтобы короткий тап срабатывал как click.
  // (drag при движении по-прежнему начнётся потому что мы ставим pointer capture и слушаем pointermove)
  if (currentSubAnim || currentAnim) return

  lastPointerIdSub.value = e.pointerId
  try { (e.target as HTMLElement)?.setPointerCapture?.(e.pointerId) } catch {}
  try { subSheet.value?.setPointerCapture?.(e.pointerId) } catch {}

  pointerVelocitySub.value = 0
  draggingSub.value = true
  startYSub.value = e.clientY
  startOffsetSub.value = baseSubOffset.value
  lastPointerTimeSub.value = performance.now()
  lastPointerYSub.value = e.clientY

  window.addEventListener('pointermove', onSubPointerMove, { passive: false })
  window.addEventListener('pointerup', onSubPointerUp)
}

function onSubPointerMove(e: PointerEvent) {
  // если главный лист в drag — игнорируем sub движения
  if (dragging.value) return

  e.preventDefault()
  const now = performance.now()
  const dt = Math.max(1, now - lastPointerTimeSub.value)

  const totalDy = e.clientY - startYSub.value
  if (Math.abs(totalDy) < DEADZONE_PX) {
    lastPointerTimeSub.value = now
    lastPointerYSub.value = e.clientY
    if (subSheet.value) subSheet.value.style.transform = `translateY(${baseSubOffset.value}px)`
    return
  }

  const dy = e.clientY - lastPointerYSub.value
  const instV = dy / dt
  pointerVelocitySub.value = pointerVelocitySub.value * 0.2 + instV * 0.8
  lastPointerTimeSub.value = now
  lastPointerYSub.value = e.clientY

  const delta = e.clientY - startYSub.value
  let newOffset = startOffsetSub.value + delta
  newOffset = clamp(newOffset, 0, closedSubOffset)
  baseSubOffset.value = newOffset
  if (subSheet.value) subSheet.value.style.transform = `translateY(${baseSubOffset.value}px)`
}

let currentSubAnimFrame: number | null = null;

function cancelAnyAnimations() {
  // отменяем rAF
  if (currentSubAnimFrame != null) {
    cancelAnimationFrame(currentSubAnimFrame)
    currentSubAnimFrame = null
  }
  // отменяем WA если он остался
  if (currentSubAnim) {
    try { currentSubAnim.cancel() } catch {}
    currentSubAnim = null
  }
}

async function runSubAnimation(fromPx: number, toPx: number, target: number, onComplete?: () => void) {
  cancelAnyAnimations()

  if (!subSheet.value) {
    baseSubOffset.value = target
    return
  }

  // 1) синхронизируем модель с реальным визуальным положением элемента
  const realY = getComputedTranslateY(subSheet.value)
  const realBaseStart = realY + (windowH - subHeightPx)
  // const realBaseStart = realY - topPanelHeight.value
  // если realY сильно отличается от fromPx, используем realY как старт
  const start = Math.abs(realY - fromPx) > 0.5 ? realY : fromPx

  console.log(realY, realBaseStart, start)

  // обновим модель и уберём любые CSS transition, чтобы избежать конфликтов
  baseSubOffset.value = start
  await nextTick()
  const prevTransition = subSheet.value.style.transition
  subSheet.value.style.transition = 'none'
  subSheet.value.style.pointerEvents = 'none'
  // если у тебя computed :style использует subOffset, то Vue сразу применит translateY(subOffset.value)

  const duration = 1420
  const startTime = performance.now()
  const delta = toPx - start

  function easeOutCubic(t: number) { return 1 - Math.pow(1 - t, 3) }

  function frame(now: number) {
    const elapsed = now - startTime
    const t = Math.min(1, elapsed / duration)
    const eased = easeOutCubic(t)
    baseSubOffset.value = start + delta * eased

    if (t < 1) {
      currentSubAnimFrame = requestAnimationFrame(frame)
    } else {
      currentSubAnimFrame = null
      baseSubOffset.value = target
      // восстановим transition (если нужно)
      subSheet.value!.style.transition = prevTransition
      subSheet.value!.style.pointerEvents = ''
    }
  }

  currentSubAnimFrame = requestAnimationFrame(frame)
}

function onSubPointerUp(e: PointerEvent) {
  draggingSub.value = false
  try { if (lastPointerIdSub.value != null) subSheet.value?.releasePointerCapture?.(lastPointerIdSub.value) } catch {}
  lastPointerIdSub.value = null

  window.removeEventListener('pointermove', onSubPointerMove)
  window.removeEventListener('pointerup', onSubPointerUp)

  let v = pointerVelocitySub.value
  const totalDy = e.clientY - startYSub.value
  if (Math.abs(totalDy) < DEADZONE_PX) v = 0
  if (Math.abs(v) < DEADZONE_V) v = 0

  const velocityInfluence = v * 300
  const predicted = baseSubOffset.value + velocityInfluence
  const shouldOpen = predicted < closedSubOffset * CLOSING_THRESHOLD
  const target = shouldOpen ? 0 : closedSubOffset

  const from = baseSubOffset.value
  const to = target

  if (subSheet.value) runSubAnimation(from, to, target)
  else baseSubOffset.value = target
}

/* --------------- resize --------------- */
function onResize() {
  windowH = window.innerHeight
  windowW = window.innerWidth
  closedOffset = windowH - closedVisibleHeight

  subHeightPx = windowH * SUB_HEIGHT_RATIO
  closedSubOffset = Math.max(0, subHeightPx - SUB_VISIBLE_PX)

  if (!dragging.value) {
    offset.value = closedOffset
    if (sheet.value) sheet.value.style.transform = `translateY(${offset.value}px)`
  }

  if (!draggingSub.value) {
    baseSubOffset.value = closedSubOffset
    if (subSheet.value) subSheet.value.style.transform = `translateY(${baseSubOffset.value}px)`
  }
}

/* --------------- lifecycle --------------- */
// debug: логируем overlayActive / offset / closedOffset / subOffset
watch(
    [overlayActive, () => offset.value, () => closedOffset, () => baseSubOffset.value],
    (vals) => {
      console.log('[DEBUG] overlayActive, offset, closedOffset, subOffset =', ...vals)
    },
    { immediate: true }
)

// дополнительный watch на progress (иногда полезно)
watch(progress, (p) => console.log('[DEBUG] progress =', p))

// лог кликов на документе — чтобы понять, что перехватывает события
function docClickLogger(e: MouseEvent) {
  console.log('[DEBUG] document click at', e.clientX, e.clientY, 'target=', (e.target as HTMLElement)?.className)
}

onMounted(() => {
  window.addEventListener('resize', onResize)
  window.addEventListener('resize', () => {
    measureWindowAndSub()
    measureTopPanel()
  })
  document.addEventListener('click', docClickLogger, true) // capture — чтобы увидеть кто первый ловит
  offset.value = closedOffset
  if (sheet.value) sheet.value.style.transform = `translateY(${offset.value}px)`

  subHeightPx = windowH * SUB_HEIGHT_RATIO
  closedSubOffset = Math.max(0, subHeightPx - SUB_VISIBLE_PX)
  baseSubOffset.value = closedSubOffset
  if (subSheet.value) subSheet.value.style.transform = `translateY(${baseSubOffset.value}px)`

  measureWindowAndSub()
  measureTopPanel()
})
onBeforeMount(async () => {
  await tracksStore.loadFeed()
  currentTrack.value = tracksStore.feedItems[1]
})

onUnmounted(() => {
  window.removeEventListener('resize', onResize)
  document.removeEventListener('click', docClickLogger, true)
  window.removeEventListener('resize', () => {
    measureWindowAndSub()
    measureTopPanel()
  })
})

/* --------------- helpers open/close --------------- */
function open() {
  const target = 0
  if (sheet.value) runAnimation(`${offset.value}px`, `0px`, target)
  else offset.value = target
}
function close() {
  const target = closedOffset
  if (sheet.value) runAnimation(`${offset.value}px`, `${target}px`, target)
  else offset.value = target
}

function openSub() {
  if (offset.value !== 0) return
  if (subSheet.value) runSubAnimation(baseSubOffset.value, 0, 0)
  else baseSubOffset.value = 0
}
function closeSub() {
  if (subSheet.value) runSubAnimation(baseSubOffset.value, closedSubOffset, closedSubOffset)
  else baseSubOffset.value = closedSubOffset
}

/* --------------- визуальные computed (fade + top mini) --------------- */
const miniBarStyle = computed(() => {
  const opacity = clamp(1 - progress.value * 3, 0, 1)
  return { opacity }
})
const miniTextOpacity = computed(() => clamp(1 - progress.value * 3, 0, 1))
const miniImageStyle = computed(() => ({
  width: `${MINI_SIZE}px`,
  height: `${MINI_SIZE}px`,
  transition: dragging.value ? 'none' : 'opacity .18s',
  opacity: miniTextOpacity.value,
}))

// верхний мини-плеер, возвращён (появляется при открытом sub)
const topMiniStyle = computed(() => {
  const opacity = clamp(subProgress.value * 1.4, 0, 1)
  const transform = `translateY(${(1 - subProgress.value) * -8}px)`
  return {
    opacity,
    transform,
    transition: draggingSub.value ? 'none' : 'opacity .12s, transform .12s',
    pointerEvents: subProgress.value > 0 ? 'auto' : 'none',
  }
})

// fade-out основного контента при открытии sub
const mainContentStyle = computed(() => ({
  opacity: String(clamp(1 - subProgress.value * 1.6, 0, 1)),
  pointerEvents: subProgress.value > 0 ? 'none' : '',
  transition: 'opacity .18s',
}))


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
const progressBarProgress = computed(() => duration.value > 0 ? (currentTime.value / duration.value) * 100 : 0)
const onSeek = (e: MouseEvent) => {
  const el = e.currentTarget as HTMLElement
  const rect = el.getBoundingClientRect()
  const percent = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1)
  player.seek(percent * duration.value)
}

</script>

<template>
  <div
      class="fixed inset-0 z-40"
      :style="{ pointerEvents: overlayActive ? 'auto' : 'none' }"
  >
    <div
        class="absolute inset-0 bg-black"
        :style="{
          opacity: String(progress * 0.45),
          pointerEvents: overlayActive ? 'auto' : 'none',
          visibility: overlayActive ? 'visible' : 'hidden'
        }"
        :aria-hidden="!overlayActive"
        @click="() => { console.log('[DEBUG] overlay clicked'); close() }"
    />

    <section
        ref="sheet"
        class="fixed left-0 right-0 bottom-0 z-50 h-screen max-h-screen rounded-t-2xl shadow-xl bg-white dark:bg-old-neutral-900"
        @pointerdown.capture="onPointerDown"
        :style="{
          ...sheetStyle,
          pointerEvents: overlayActive ? '' : 'none'
        }"
    >

    <!-- handle -->
      <div class="w-full flex justify-center p-3 pointer-events-none">
        <div class="w-20 h-3 rounded-full bg-old-neutral-300 dark:bg-old-neutral-600" />
      </div>

      <!-- mini-player (при закрытом основном sheet) -->
      <div
          class="absolute left-4 right-4 top-3 flex items-center gap-3 pointer-events-auto"
          :style="[miniBarStyle, { pointerEvents: 'auto' }]"
      >
        <div :style="miniImageStyle" class="rounded-md overflow-hidden flex-shrink-0">
          <img src="https://picsum.photos/400" alt="cover-mini" class="object-cover w-full h-full" />
        </div>

        <div class="flex flex-col overflow-hidden">
          <div class="text-sm font-medium truncate" :style="{ opacity: String(miniTextOpacity) }">Artist Name</div>
          <div class="text-xs text-old-neutral-500 truncate" :style="{ opacity: String(miniTextOpacity) }">Track Title</div>
        </div>
      </div>

      <!-- основной контент плеера: фейдится при открытии sub -->
      <div ref="content" class="h-full px-4 pb-8 pt-4" :style="mainContentStyle">
        <div class="w-[80%] aspect-square mx-auto mb-4 rounded-lg overflow-hidden">
          <div v-if="!currentTrack?.cover_url" :style="coverStyle" class="flex justify-center items-center bg-gradient-to-br from-gray-200 to-gray-300">
            <UIcon name="i-heroicons-musical-note" class="icon w-20 h-20 text-gray-400" />
          </div>
          <img
              v-else
              :style="coverStyle"
              :src="currentTrack?.cover_url"
              alt="cover"
              class="object-cover w-full h-full"
          >
        </div>

        <div>
          <div class="mt-4 flex items-center justify-center gap-6 mb-2">
            <UButton icon="i-heroicons-backward" variant="ghost" class="text-old-neutral-400 hover:text-old-neutral-200 transition" @click="player.playPrevious()"/>
            <UButton color="white" class="hover:scale-105 transition flex justify-center items-center bg-white text-old-neutral-900 w-12 h-12 rounded-full" @click="isPlaying ? player.pause() : player.resume()">
              <UIcon :name="isPlaying ? 'i-heroicons-pause' : 'i-heroicons-play-solid'" class="w-5 h-5" />
            </UButton>
            <UButton icon="i-heroicons-forward" class="text-old-neutral-400 hover:text-old-neutral-200 transition" variant="ghost" color="white" @click="player.playNext()"/>
          </div>

          <!-- Progress Bar -->
          <div class="flex flex-col gap-2 text-xs w-full">
            <!-- TRACK: занимает всю ширину родителя -->
            <div
                class="w-full h-1 bg-old-neutral-700 rounded cursor-pointer relative"
                @click="onSeek"
                role="progressbar"
                :aria-valuenow="Math.round(progressBarProgress)"
                aria-valuemin="0"
                aria-valuemax="100"
            >
              <!-- FILLED: абсолютный, высота h-full, ширина через style -->
              <div
                  class="absolute left-0 top-0 h-full rounded"
                  :style="{ width: `${progressBarProgress}%`, transition: 'width .18s linear' }"
              ></div>
            </div>

            <!-- TIMES: тоже занимает всю ширину и выравнивается по краям бара -->
            <div class="flex justify-between items-center w-full">
              <span class="text-xs">{{ formatTime(currentTime) }}</span>
              <span class="text-xs text-right">{{ formatTime(duration) }}</span>
            </div>
          </div>
        </div>

      </div>

      <!-- subSheet: drag НЕ вешается на весь контейнер, только на ручку внутри -->
      <div
          ref="subSheet"
          class="bg-white dark:bg-old-neutral-800"
          :style="subStyle"
      >
        <!-- Ручка subSheet: drag (pointerdown) только здесь; клик по ручке открывает/закрывает -->
        <div class="w-full flex justify-center p-3" style="pointer-events:auto;">
          <div
              class="w-20 h-3 rounded-full bg-old-neutral-300 dark:bg-old-neutral-600 cursor-grab"
              @pointerdown.capture="onSubPointerDown"
              @click.stop.prevent="subProgress > 0 ? closeSub() : openSub()"
              title="Открыть / закрыть"
          />
        </div>

        <!-- содержимое subSheet -->
        <div class="px-4 pb-6" style="height: calc(100% - 40px); overflow: auto;">
          <h4 class="text-base font-semibold mb-2">Дополнительная панель</h4>
          <p class="text-sm text-old-neutral-600 dark:text-old-neutral-300 mb-4">Эта панель открывается из полноэкранного плеера и скрывает основной контент.</p>

          <div class="h-40 bg-old-neutral-100 rounded-lg" />
          <div class="h-40 bg-old-neutral-200 rounded-lg mt-3" />
        </div>
      </div>

      <!-- верхний мини-плеер (возвращён) — появляется при открытом sub -->
      <div
          ref="topPanel"
          class="absolute left-4 right-4 top-3 flex items-center gap-3 pointer-events-auto"
          :style="topMiniStyle"
      >
        <div :style="miniImageStyle" class="rounded-md overflow-hidden flex-shrink-0">
          <img src="https://picsum.photos/400" alt="cover-mini-top" class="object-cover w-full h-full" />
        </div>

        <div class="flex flex-col overflow-hidden">
          <div class="text-sm font-medium truncate">Artist Name</div>
          <div class="text-xs text-old-neutral-500 truncate">Track Title</div>
        </div>
      </div>

    </section>
  </div>
</template>

<style scoped>
section {
  will-change: transform;
  -webkit-tap-highlight-color: transparent;
}
</style>
