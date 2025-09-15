<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Track } from "@/types";
import { useDominantColorFromImg } from '@/composables/useDominantColorFromImg'

defineProps<{ mode: 'sidebar' | 'fullscreen' }>()
const player = usePlayerStore()
const { queue, currentTrackIndex } = storeToRefs(player)
const track = computed(() => player.currentTrack)

const nextTrack:Track = computed(() => {
  if (!queue.value.length) return null
  const nextIndex = (currentTrackIndex.value + 1) % queue.value.length
  return queue.value[nextIndex]
})

const imgEl = ref<HTMLImageElement | null>(null)
const { color } = useDominantColorFromImg(imgEl, { sampleSize: 900, k: 3, saturationThreshold: 0.5 })

watch(() => track.value.cover_url, () => {
  if (imgEl.value && imgEl.value.complete && imgEl.value.naturalWidth) {
    // пересчитать сразу
    const evt = new Event('load')
    imgEl.value.dispatchEvent(evt)
  }
})
</script>

<template>
  <div
      v-if="mode === 'fullscreen'"
      :style="{ backgroundColor: color }"
  >
    <!-- Верхняя панель -->
    <div
        class="sticky top-0 z-10 px-4 py-3 flex items-center justify-between group"
    >
      <div class="flex items-center space-x-2">
        <!-- Кнопка закрытия -->
        <UButton
            icon="i-heroicons-x-mark"
            variant="ghost"
            color="white"
            size="sm"
            class="transition-transform duration-200 hover:scale-110 hover:bg-white/10"
            @click="player.closeView('now')"
        />
        <!-- Title -->
        <span class="text-white font-medium text-sm hover:underline cursor-pointer">
          {{ track?.title || 'No title' }}
        </span>
      </div>
      <!-- Контекстное меню -->
      <div class="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition">
        <!-- TODO: Dropdown меню -->
        <UButton
            icon="i-heroicons-ellipsis-vertical" size="sm" variant="ghost" color="white"
            class="transition-transform duration-200 hover:scale-110 hover:bg-white/10"/>
        <!-- Кнопка разворота -->
        <UButton
            icon="i-heroicons-arrows-pointing-in"
            size="sm"
            variant="ghost"
            color="white"
            class="transition-transform duration-200 hover:scale-110 hover:bg-white/10"
            @click="player.switchViewMode('now')"
        />
      </div>
    </div>
    <main>
      <div
          class="flex-1 flex flex-col items-center  overflow-y-auto px-4"
          :class="mode === 'fullscreen' ? 'py-6' : 'py-4 space-y-6'"
      >
        <div class="w-96 h-200 flex justify-center items-center">
          <img
              v-if="track?.cover_url"
              :ref="imgEl"
              :src="track?.cover_url"
              class="object-cover rounded shadow"
              alt="Cover"
              crossorigin="anonymous"
          >
          <UIcon
              v-else
              name="i-heroicons-musical-note"
              class="w-5 h-5 text-gray-400"
          />
        </div>

        <div>
          <!-- Инфо -->
          <div class="flex items-center bg-old-neutral-800 mb-3 space-x-4 rounded-lg">
            <div class="p-4">
              <h2 class="text-white text-xl font-bold hover:underline cursor-pointer">
                {{ track?.title || 'Untitled' }}
              </h2>
              <p class="text-sm text-gray-400 hover:underline cursor-pointer">
                {{ track?.track_authors?.map(a => a.author.name).join(', ') || 'Unknown Artist' }}
              </p>
              <!-- Hover-действия -->
              <div class="mt-2 flex space-x-3">
                <UButton
                    icon="i-heroicons-link" size="xs" variant="ghost" color="white"
                    class="text-gray-400 transition-transform duration-200 hover:scale-110 hover:bg-white/10"/>
                <UButton
                    icon="i-heroicons-heart" size="xs" variant="ghost" color="white"
                    class="text-gray-400 transition-transform duration-200 hover:scale-110 hover:bg-white/10"/>
              </div>
            </div>
          </div>

          <!-- Карточки (grid в fullscreen, stack в sidebar) -->
          <div
              :class="mode === 'fullscreen'
          ? 'grid grid-cols-2 gap-4'
          : 'flex flex-col space-y-4'"
              class="*:rounded-lg *:bg-old-neutral-800"
          >
            <!-- Карточка: Об исполнителе -->
            <div class="p-4 shadow hover:shadow-lg transition hover:scale-[1.02]">
              <h3 class="font-semibold mb-1 text-white">Об исполнителе</h3>
              <p class="text-sm text-gray-400">Тут краткая биография, ссылки, жанры и т.п.</p>
            </div>

            <!-- Карточка: Сведения о треке -->
            <div class="p-4 shadow hover:shadow-lg transition hover:scale-[1.02]">
              <h3 class="font-semibold mb-1 text-white">Сведения</h3>
              <ul class="text-sm text-gray-400 space-y-1">
                <li>Альбом: {{ track?.album?.title || 'Без альбома' }}</li>
                <li>Загружено: {{ track?.created_at?.slice(0, 10) }}</li>
                <!-- и т.п. -->
              </ul>
            </div>

            <!-- Карточка: Далее в очереди -->
            <div class="p-4 shadow hover:shadow-lg transition hover:scale-[1.02] col-span-2">
              <div>
                <h3 class="font-semibold mb-2 text-white">Далее в очереди</h3>
                <UButton
                    size="sm"
                    color="white"
                    variant="ghost"
                    class="hover:underline text-gray-400"
                    @click="player.openView('queue')"
                >
                  Показать очередь
                </UButton>
              </div>
              <div class="flex items-center justify-between">
                <div>
                  <!-- TODO Make it a button -->
                  <p class="text-sm text-gray-400">Следующий трек: <span class="font-semibold">{{ nextTrack.title }}</span></p>
                </div>

              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
  <!-- Sidebar -->
  <div v-else class="h-full w-full flex flex-col text-white">
    <!-- Верхняя панель -->
    <div
        class="sticky top-0 z-10 bg-old-neutral-900 px-4 py-3 flex items-center justify-between group"
    >
      <div class="flex items-center space-x-2">
        <!-- Кнопка закрытия -->
        <UButton
            icon="i-heroicons-x-mark"
            variant="ghost"
            color="white"
            size="sm"
            class="transition-transform duration-200 hover:scale-110 hover:bg-white/10"
            @click="player.closeView('now')"
        />

        <!-- Автор -->
        <span class="font-medium text-sm hover:underline cursor-pointer">
          {{ track?.title || 'No title' }}
        </span>
      </div>

      <!-- Контекстное меню -->
      <div class="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition">
        <!-- TODO: Dropdown меню -->
        <UButton
            icon="i-heroicons-ellipsis-vertical" size="sm" variant="ghost" color="white"
            class="transition-transform duration-200 hover:scale-110 hover:bg-white/10"/>
        <!-- Кнопка разворота -->
        <UButton
            icon="i-heroicons-arrows-pointing-out"
            size="sm"
            variant="ghost"
            color="white"
            class="transition-transform duration-200 hover:scale-110 hover:bg-white/10"
            @click="player.switchViewMode('now')"
        />
      </div>
    </div>

    <!-- Основная часть (scrollable) -->
    <div
        class="flex-1 overflow-y-auto p-4 space-y-6"
    >
      <!-- Обложка и инфо -->
      <div class="flex items-center space-x-4">
        <div class="w-24 h-24 flex justify-center items-center shadow-xl">
          <img
              v-if="track?.cover_url"
              :src="track?.cover_url"
              class="object-cover rounded shadow"
              alt="Cover">
          <UIcon
              v-else
              name="i-heroicons-musical-note"
              class="w-5 h-5"
          />
        </div>
        <div>
          <h2 class="text-xl font-bold hover:underline cursor-pointer">
            {{ track?.title || 'Untitled' }}
          </h2>
          <p class="text-sm text-gray-400 hover:underline cursor-pointer">
            {{ track?.track_authors?.map(a => a.author.name).join(', ') || 'Unknown Artist' }}
          </p>
          <!-- Hover-действия -->
          <div class="mt-2 flex space-x-3">
            <UButton
                icon="i-heroicons-link" size="xs" variant="ghost" color="white"
                class="transition-transform duration-200 hover:scale-110 hover:bg-white/10"/>
            <UButton
                icon="i-heroicons-heart" size="xs" variant="ghost" color="white"
                class="transition-transform duration-200 hover:scale-110 hover:bg-white/10"/>
          </div>
        </div>
      </div>

      <!-- Карточки (grid в fullscreen, stack в sidebar) -->
      <div
          :class="mode === 'fullscreen'
          ? 'grid grid-cols-2 gap-4'
          : 'flex flex-col space-y-4'"
          class="*:rounded-xl *:bg-old-neutral-800"
      >
        <!-- Карточка: Об исполнителе -->
        <div class="p-4 shadow hover:shadow-lg transition hover:scale-[1.02]">
          <h3 class="font-semibold mb-1">Об исполнителе</h3>
          <p class="text-sm text-gray-400">Тут краткая биография, ссылки, жанры и т.п.</p>
        </div>

        <!-- Карточка: Сведения о треке -->
        <div class="p-4 shadow hover:shadow-lg transition hover:scale-[1.02]">
          <h3 class="font-semibold mb-1">Сведения</h3>
          <ul class="text-sm text-gray-400 space-y-1">
            <li>Альбом: {{ track?.album?.title || 'Без альбома' }}</li>
            <li>Загружено: {{ track?.created_at?.slice(0, 10) }}</li>
            <!-- и т.п. -->
          </ul>
        </div>

        <!-- Карточка: Далее в очереди -->
        <div class="p-4 shadow hover:shadow-lg transition hover:scale-[1.02] col-span-2">
          <div class="flex items-center justify-between mb-2">
            <h3 class="font-semibold mb-2 truncate whitespace-nowrap overflow-hidden text-ellipsis">Далее в очереди</h3>
            <UButton
                size="sm"
                color="white"
                variant="ghost"
                class="hover:underline whitespace-nowrap"
                @click="player.openView('queue')"
            >
              Показать очередь
            </UButton>
          </div>
          <div class="flex items-center justify-between">
            <button class="flex flex-row w-full h-12">
              <img
                  v-if="nextTrack.cover_url"
                  :src="nextTrack.cover_url"
                  alt="cover"
                  class="w-12 h-12 rounded shadow"
              >
              <div class="flex flex-col justify-start ml-3">
                <span class="font-semibold text-left">{{ nextTrack.title }}</span>
                <span
                    v-for="author in nextTrack.track_authors"
                    :key="author.author_id"
                    class="flex flex-row">
                  <NuxtLink
                      :to="`/authors/${author.author_id}`"
                      class="text-sm text-gray-400 hover:underline cursor-pointer">
                    {{ author.author.name || 'Unknown Artist' }}
                </NuxtLink>
                </span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
