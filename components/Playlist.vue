<script setup lang="ts">
import { usePlayerStore } from '@/stores/player'
import { storeToRefs } from 'pinia'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const props = defineProps({
  playlist: {
    type: Object,
    required: true
  },
  tracks: {
    type: Array,
    default: () => []
  },
  isLoading: {
    type: Boolean,
    default: false
  },
  showHeader: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['play-track'])

const playerStore = usePlayerStore()
const { currentTrack, isPlaying } = storeToRefs(playerStore)

const isCurrentTrack = (track) => {
  return currentTrack.value && currentTrack.value.id === track.id
}

const playTrack = (track, trackList) => {
  emit('play-track', { track, trackList })
}

// Format seconds to mm:ss
const formatDuration = (seconds) => {
  if (!seconds) return '--:--'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}
</script>

<template>
  <div class="playlist-container">
    <!-- Playlist Header -->
    <div v-if="showHeader" class="playlist-header mb-6">
      <div class="flex items-start gap-6">
        <!-- Playlist Cover -->
        <div class="playlist-cover w-48 h-48 bg-gray-200 rounded-md shadow-md flex items-center justify-center">
          <UIcon v-if="!playlist.cover_url" name="i-heroicons-musical-note" class="w-16 h-16 text-gray-400" />
          <img v-else :src="playlist.cover_url" class="w-full h-full object-cover rounded-md" alt="Playlist cover" >
        </div>

        <!-- Playlist Info -->
        <div class="playlist-info flex-1">
          <div class="text-sm uppercase font-medium text-gray-500 mb-1">Playlist</div>
          <h1 class="text-3xl font-bold mb-2">{{ playlist.name }}</h1>
          <div class="text-sm text-gray-600 mb-4">
            {{ tracks.length }} tracks • Created by {{ playlist.user_name || 'You' }}
          </div>

          <!-- Action Buttons -->
          <div class="flex gap-3 mt-4">
            <button 
              :disabled="tracks.length === 0 || isLoading" 
              class="bg-green-500 hover:bg-green-600 text-white py-2 px-6 rounded-full flex items-center"
              @click="playTrack(tracks[0], tracks)"
            >
              <UIcon name="i-heroicons-play" class="w-5 h-5 mr-2" />
              Play
            </button>
            <button class="bg-transparent border border-gray-300 hover:bg-gray-100 py-2 px-4 rounded-full">
              <UIcon name="i-heroicons-heart" class="w-5 h-5" />
            </button>
            <button class="bg-transparent border border-gray-300 hover:bg-gray-100 py-2 px-4 rounded-full">
              <UIcon name="i-heroicons-ellipsis-horizontal" class="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Tracks List -->
    <div class="tracks-list">
      <div v-if="isLoading" class="flex justify-center items-center py-10">
        <div class="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500"><!-- TODO add an icon --></div>
      </div>

      <div v-else-if="tracks.length === 0" class="text-center py-8 bg-gray-50 rounded-lg">
        <p class="text-gray-500">This playlist is empty.</p>
      </div>

      <div v-else>
        <!-- Tracks Table Header -->
        <div class="grid grid-cols-12 gap-4 py-2 px-4 border-b text-sm font-medium text-gray-500">
          <div class="col-span-1">#</div>
          <div class="col-span-5">Title</div>
          <div class="col-span-4">Artist</div>
          <div class="col-span-2 text-right">Duration</div>
        </div>

        <!-- Track Items -->
        <div 
          v-for="(track, index) in tracks" 
          :key="track.id"
          class="grid grid-cols-12 gap-4 py-3 px-4 hover:bg-gray-50 border-b items-center"
          :class="{ 'bg-gray-50': isCurrentTrack(track) }"
        >
          <!-- Track Number/Play Button -->
          <div class="col-span-1 flex items-center">
            <span v-if="!isCurrentTrack(track) && !isPlaying" class="text-gray-400">{{ index + 1 }}</span>
            <button 
              v-else
              class="text-gray-600 hover:text-indigo-600"
              @click="playTrack(track, tracks)"
            >
              <UIcon 
                :name="isCurrentTrack(track) && isPlaying ? 'i-heroicons-pause' : 'i-heroicons-play'" 
                class="w-5 h-5" 
              />
            </button>
          </div>

          <!-- Track Title & Cover -->
          <div class="col-span-5 flex items-center">
            <img 
              :src="track.cover_url || 'https://via.placeholder.com/40x40?text=No+Cover'" 
              class="w-10 h-10 object-cover rounded mr-3"
              alt="Track cover"
            >
            <div>
              <div class="font-medium" :class="{ 'text-indigo-600': isCurrentTrack(track) }">
                {{ track.title }}
              </div>
            </div>
          </div>

          <!-- Artist -->
          <div class="col-span-4 truncate">
            <span v-if="track.track_authors && track.track_authors.length">
              <span v-for="(rel, idx) in track.track_authors" :key="rel.author.id">
                {{ rel.author.name }}<span v-if="idx < track.track_authors.length - 1">, </span>
              </span>
            </span>
            <span v-else>Unknown Artist</span>
          </div>

          <!-- Duration -->
          <div class="col-span-2 text-right text-gray-500">
            {{ track.duration ? formatDuration(track.duration) : '--:--' }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.playlist-container {
  width: 100%;
}

.playlist-header {
  position: relative;
}

.tracks-list {
  margin-top: 1rem;
}
</style>
