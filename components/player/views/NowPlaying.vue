<script setup lang="ts">
defineProps<{ mode: 'sidebar' | 'fullscreen' }>()

const player = usePlayerStore()
</script>

<template>
  <div :class="mode === 'fullscreen' ? 'h-full flex flex-col' : 'h-full flex flex-col'">
    <!-- 🧭 ВЕРХНЯЯ ПАНЕЛЬ (фиксирована, не скроллится) -->
    <div class="sticky top-0 z-10 bg-neutral-900 px-4 py-3 border-b border-neutral-700 flex items-center justify-between group">
      <div class="flex items-center gap-3">
        <!-- Название автора -->
        <span class="text-white font-medium">Имя автора</span>
      </div>

      <div class="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition">
        <!-- Контекстное меню -->
        <UDropdownMenu
          :items="[
          { label: 'Добавить в плейлист', click: () => {} },
          { label: 'Добавить в любимые треки', click: () => {} },
          { label: 'Добавить в очередь', click: () => {} },
          { label: 'К исполнителю', click: () => {} },
          { label: 'К альбому', click: () => {} },
          { label: 'Сведения о треке', click: () => {} },
          { label: 'Поделиться', click: () => {} }
        ]">
          <UButton icon="i-heroicons-ellipsis-horizontal" variant="ghost" size="sm" color="white" />
        </UDropdownMenu>

        <!-- Кнопка закрытия -->
        <UButton icon="i-heroicons-x-mark" variant="ghost" size="sm" color="white" @click="player.closeView('now')" />
      </div>
    </div>

    <!-- 🧱 ОСНОВНОЙ КОНТЕНТ -->
    <div class="flex-1 overflow-y-auto px-4 py-6">
      <!-- Sidebar режим -->
      <div v-if="mode === 'sidebar'" class="space-y-6">
        <!-- Обложка, Название, Автор + hover действия -->
        <div class="flex items-start gap-4 group">
          <img src="https://via.placeholder.com/100" class="w-24 h-24 rounded shadow" />
          <div class="flex flex-col">
            <p class="text-lg font-semibold">Название трека</p>
            <p class="text-sm text-gray-400">Имя исполнителя</p>
            <div class="flex gap-2 mt-2 opacity-0 group-hover:opacity-100 transition">
              <UButton icon="i-heroicons-link" size="sm" color="white" variant="ghost" />
              <UButton icon="i-heroicons-heart" size="sm" color="white" variant="ghost" />
            </div>
          </div>
        </div>

        <!-- Карточка: Об исполнителе -->
        <UCard>
          <template #header>Об исполнителе</template>
          <p class="text-sm text-gray-300">Краткая биография, жанр, альбомы и т.д.</p>
        </UCard>

        <!-- Карточка: Сведения о треке -->
        <UCard>
          <template #header>Сведения о треке</template>
          <p class="text-sm text-gray-300">Дата релиза, длительность, жанр и т.д.</p>
        </UCard>

        <!-- Карточка: Далее в очереди -->
        <UCard>
          <template #header>Следующий трек</template>
          <div class="flex items-center justify-between">
            <div>
              <p class="text-white">Следующий трек</p>
              <p class="text-sm text-gray-400">Исполнитель</p>
            </div>
            <UButton size="sm" label="Очередь" @click="player.openView('queue')" />
          </div>
        </UCard>
      </div>

      <!-- Fullscreen режим -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Левая колонка: об исполнителе -->
        <UCard>
          <template #header>Об исполнителе</template>
          <p class="text-sm text-gray-300">Биография, жанр, релизы...</p>
        </UCard>

        <!-- Правая колонка: две карточки -->
        <div class="space-y-6">
          <UCard>
            <template #header>Сведения о треке</template>
            <p class="text-sm text-gray-300">Дата, длительность, лейбл...</p>
          </UCard>

          <UCard>
            <template #header>Следующий трек</template>
            <div class="flex items-center justify-between">
              <div>
                <p class="text-white">Следующий трек</p>
                <p class="text-sm text-gray-400">Исполнитель</p>
              </div>
              <UButton size="sm" label="Очередь" @click="player.openView('queue')" />
            </div>
          </UCard>
        </div>
      </div>
    </div>
  </div>
</template>
