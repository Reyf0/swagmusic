<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import type { Track } from '#shared/types'

// "…" menu for a track: queue actions, add to playlist, go to artist, report.
const props = defineProps<{
  track: Track
  /** Extra items shown at the end, e.g. "Remove from this playlist". */
  extraItems?: DropdownMenuItem[]
}>()

const playerStore = usePlayerStore()
const playlistsStore = usePlaylistsStore()
const reportSubject = useReportSubject()
const user = useSupabaseUser()

const items = computed<DropdownMenuItem[][]>(() => {
  const groups: DropdownMenuItem[][] = [
    [
      { label: 'Play next', icon: 'i-lucide-list-start', onSelect: () => playerStore.playNextInQueue(props.track) },
      { label: 'Add to queue', icon: 'i-lucide-list-plus', onSelect: () => playerStore.addToQueue(props.track) },
      { label: 'Add to playlist', icon: 'i-lucide-list-music', onSelect: () => playlistsStore.openAddToPlaylist(props.track) },
    ],
  ]
  const artists = props.track.authors ?? []
  if (artists.length) {
    groups.push(artists.map(a => ({
      label: artists.length > 1 ? `Go to ${a.username ?? 'artist'}` : 'Go to artist',
      icon: 'i-lucide-user-round',
      to: `/authors/${a.id}`,
    })))
  }
  if (props.extraItems?.length) groups.push(props.extraItems)
  // Not on your own uploads.
  if (props.track.user_id !== user.value?.id) {
    groups.push([{ label: 'Report', icon: 'i-lucide-flag', onSelect: () => { reportSubject.value = { type: 'track', id: props.track.id, title: props.track.title } } }])
  }
  return groups
})
</script>

<template>
  <UDropdownMenu :items="items" :content="{ align: 'end' }">
    <UButton
      icon="i-heroicons-ellipsis-horizontal"
      color="neutral"
      variant="ghost"
      size="sm"
      :aria-label="`More actions for ${track.title}`"
      @click.stop
    />
  </UDropdownMenu>
</template>
