<script setup lang="ts">
import { isTrackWithAuthors, isTrackUI } from '@/types/track-entities'
import type { TrackEntity } from '@/types/track-entities'

function renderTrack(t: TrackEntity) {
  if (isTrackUI(t)) {
    // безопасно использовать UI-поля, например is_liked_by_user
    console.log('UI track likes', t.is_liked_by_user)
  } else if (isTrackWithAuthors(t)) {
    // безопасно использовать authors
    console.log('Has authors:', t.authors.map(a => a.name).join(', '))
  } else {
    // base
    console.log('Simple track', t.title)
  }
}
definePageMeta({
  layout: 'admin',
  middleware: ['admin']
});


</script>

<template>
  <PlayerDragFix />
</template>

<style scoped>

</style>