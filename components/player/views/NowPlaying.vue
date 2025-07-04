<script setup lang="ts">
import { computed, onMounted } from 'vue'
defineProps<{ mode: 'sidebar' | 'fullscreen' }>()
const player = usePlayerStore()
const track = computed(() => player.currentTrack)

</script>

<template>
  <div
      v-if="mode === 'fullscreen'"
  >
    <!-- Верхняя панель -->
    <div
        class="sticky top-0 z-10 bg-neutral-900 px-4 py-3 flex items-center justify-between group"
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
          {{ track?.author?.name || 'Unknown Artist' }}
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
    <main class="grid grid-cols-2 gap-4">
      <div
          class="flex-1 overflow-y-auto px-4"
          :class="mode === 'fullscreen' ? 'py-6' : 'py-4 space-y-6'"
      >
        <!-- Обложка и инфо -->
        <div class="flex items-center space-x-4">
          <img
              :src="track?.cover_url || 'https://via.placeholder.com/300x300?text=No+Cover'"
              class="w-24 h-24 object-cover rounded shadow"
          >
          <div>
            <h2 class="text-xl font-bold hover:underline cursor-pointer">
              {{ track?.title || 'Untitled' }}
            </h2>
            <p class="text-sm text-gray-400 hover:underline cursor-pointer">
              {{ track?.author?.name || 'Unknown Artist' }}
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
        >
          <!-- Карточка: Об исполнителе -->
          <div class="bg-neutral-800 p-4 rounded shadow hover:shadow-lg transition hover:scale-[1.02]">
            <h3 class="font-semibold mb-1">Об исполнителе</h3>
            <p class="text-sm text-gray-400">Тут краткая биография, ссылки, жанры и т.п.</p>
          </div>

          <!-- Карточка: Сведения о треке -->
          <div class="bg-neutral-800 p-4 rounded shadow hover:shadow-lg transition hover:scale-[1.02]">
            <h3 class="font-semibold mb-1">Сведения</h3>
            <ul class="text-sm text-gray-400 space-y-1">
              <li>Альбом: {{ track?.album?.title || 'Без альбома' }}</li>
              <li>Загружено: {{ track?.created_at?.slice(0, 10) }}</li>
              <!-- и т.п. -->
            </ul>
          </div>

          <!-- Карточка: Далее в очереди -->
          <div class="bg-neutral-800 p-4 rounded shadow hover:shadow-lg transition hover:scale-[1.02] col-span-2">
            <h3 class="font-semibold mb-2">Далее в очереди</h3>
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm">Следующий трек: <span class="font-semibold">Track title</span></p>
              </div>
              <UButton
                  size="sm"
                  color="white"
                  variant="ghost"
                  class="hover:underline"
                  @click="player.openView('queue')"
              >
                Показать очередь
              </UButton>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>

  <div v-else class="h-full w-full flex flex-col text-white">
    <!-- Верхняя панель -->
    <div
        class="sticky top-0 z-10 bg-neutral-900 px-4 py-3 flex items-center justify-between group"
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
          {{ track?.author?.name || 'Unknown Artist' }}
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
        class="flex-1 overflow-y-auto px-4"
        :class="mode === 'fullscreen' ? 'py-6' : 'py-4 space-y-6'"
    >
      <!-- Обложка и инфо -->
      <div class="flex items-center space-x-4">
        <img
            :src="track?.cover_url || 'https://via.placeholder.com/300x300?text=No+Cover'"
            class="w-24 h-24 object-cover rounded shadow"
        >
        <div>
          <h2 class="text-xl font-bold hover:underline cursor-pointer">
            {{ track?.title || 'Untitled' }}
          </h2>
          <p class="text-sm text-gray-400 hover:underline cursor-pointer">
            {{ track?.author?.name || 'Unknown Artist' }}
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
      >
        <!-- Карточка: Об исполнителе -->
        <div class="bg-neutral-800 p-4 rounded shadow hover:shadow-lg transition hover:scale-[1.02]">
          <h3 class="font-semibold mb-1">Об исполнителе</h3>
          <p class="text-sm text-gray-400">Тут краткая биография, ссылки, жанры и т.п.</p>
        </div>

        <!-- Карточка: Сведения о треке -->
        <div class="bg-neutral-800 p-4 rounded shadow hover:shadow-lg transition hover:scale-[1.02]">
          <h3 class="font-semibold mb-1">Сведения</h3>
          <ul class="text-sm text-gray-400 space-y-1">
            <li>Альбом: {{ track?.album?.title || 'Без альбома' }}</li>
            <li>Загружено: {{ track?.created_at?.slice(0, 10) }}</li>
            <!-- и т.п. -->
          </ul>
        </div>

        <!-- Карточка: Далее в очереди -->
        <div class="bg-neutral-800 p-4 rounded shadow hover:shadow-lg transition hover:scale-[1.02] col-span-2">
          <h3 class="font-semibold mb-2">Далее в очереди</h3>
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm">Следующий трек: <span class="font-semibold">Track title</span></p>
            </div>
            <UButton
                size="sm"
                color="white"
                variant="ghost"
                class="hover:underline"
                @click="player.openView('queue')"
            >
              Показать очередь
            </UButton>
          </div>
        </div>
      </div>
    </div>
  </div>

</template>
