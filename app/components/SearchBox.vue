<script setup lang="ts">
import type { Track } from '#shared/types'

// Header search with a live preview of tracks, artists, albums and playlists; with an empty
// field it shows recent searches and recently played tracks.
// ↑/↓ move through the results, Enter opens the highlighted one (or the full search), Esc closes.
const props = withDefaults(defineProps<{
  /** Show the preview (off on /search, where the page itself updates live). */
  preview?: boolean
  /** Results in the page flow instead of a floating dropdown (mobile overlay). */
  inline?: boolean
  autofocus?: boolean
  inputUi?: Record<string, string>
  size?: 'md' | 'lg'
}>(), {
  preview: true,
  inline: false,
  autofocus: false,
  inputUi: undefined,
  size: 'md',
})
// submit: open the full search; navigate: a result was picked (lets the mobile overlay close)
const emit = defineEmits<{ submit: [], navigate: [] }>()
const text = defineModel<string>({ required: true })

const route = useRoute()
const user = useSupabaseUser()
const { playTrack } = usePlayTrack()
const tracksStore = useTracksStore()
const { recentItems } = storeToRefs(tracksStore)
const { recent, add: addRecent, remove: removeRecent, clear: clearRecent } = useRecentSearches()

const focused = ref(false)
const dismissed = ref(false)
const active = ref(-1)
const listId = useId()

const enabled = computed(() => props.preview)
const { results, loading, isEmpty, term } = useQuickSearch(text, enabled)

// Empty field: recent searches + recently played instead of results.
const showingRecent = computed(() => !text.value.trim())
const recentTracks = computed(() => {
  if (!user.value) return []
  const seen = new Set<string>()
  return recentItems.value.filter(t => !seen.has(t.id) && !!seen.add(t.id)).slice(0, 4)
})
const hasRecent = computed(() => recent.value.length > 0 || recentTracks.value.length > 0)

const open = computed(() => props.preview && !dismissed.value && (focused.value || props.inline)
  && (showingRecent.value ? hasRecent.value : true))

type Item =
  | { kind: 'track', key: string, track: Track, list: Track[] }
  | { kind: 'link', key: string, to: string }
  | { kind: 'query', key: string, q: string }
  | { kind: 'all', key: string }

// Flat list in display order, for keyboard navigation.
const items = computed<Item[]>(() => showingRecent.value ? [
  ...recent.value.map(q => ({ kind: 'query' as const, key: `q-${q}`, q })),
  ...recentTracks.value.map(track => ({ kind: 'track' as const, key: `rt-${track.id}`, track, list: recentTracks.value })),
] : [
  ...results.value.tracks.map(track => ({ kind: 'track' as const, key: `t-${track.id}`, track, list: results.value.tracks })),
  ...results.value.artists.map(a => ({ kind: 'link' as const, key: `a-${a.id}`, to: `/authors/${a.id}` })),
  ...results.value.albums.map(a => ({ kind: 'link' as const, key: `al-${a.id}`, to: `/albums/${a.id}` })),
  ...results.value.playlists.map(p => ({ kind: 'link' as const, key: `p-${p.id}`, to: `/playlist/${p.id}` })),
  { kind: 'all' as const, key: 'all' },
])
const indexOf = (key: string) => items.value.findIndex(i => i.key === key)
const optionId = (key: string) => `${listId}-${key}`

watch(text, () => {
  dismissed.value = false
  active.value = -1
})
watch(() => route.fullPath, () => { dismissed.value = true })

function close() {
  dismissed.value = true
  active.value = -1
}

async function select(item: Item | undefined) {
  if (item?.kind === 'query') {
    text.value = item.q
    addRecent(item.q)
    close()
    emit('submit')
    return
  }
  // Picking something from the results remembers what was typed.
  if (!showingRecent.value) addRecent(text.value)
  if (!item || item.kind === 'all') {
    close()
    emit('submit')
    return
  }
  if (item.kind === 'track') {
    playTrack(item.track, item.list)
    close()
    emit('navigate')
    return
  }
  close()
  emit('navigate')
  await navigateTo(item.to)
}

function onKeydown(e: KeyboardEvent) {
  if (!open.value) return
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    active.value = (active.value + 1) % items.value.length
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    active.value = active.value <= 0 ? items.value.length - 1 : active.value - 1
  } else if (e.key === 'Enter' && active.value >= 0) {
    e.preventDefault()
    select(items.value[active.value])
  } else if (e.key === 'Escape') {
    close()
  }
}

function onSubmit() {
  addRecent(text.value)
  close()
  emit('submit')
}

function onFocus() {
  focused.value = true
  dismissed.value = false
  if (user.value && !recentItems.value.length) tracksStore.loadRecent({ userId: user.value.id })
}

// Clicks inside the panel shouldn't blur the input before they register.
function onBlur() {
  setTimeout(() => { focused.value = false }, 100)
}

const artistName = (a: { username: string | null; full_name: string | null }) => a.username || a.full_name || 'Unnamed artist'
</script>

<template>
  <form class="relative" role="search" @submit.prevent="onSubmit">
    <UInput
      v-model="text"
      icon="i-heroicons-magnifying-glass"
      placeholder="Search tracks, artists, albums, playlists"
      :size="size"
      class="w-full"
      :ui="inputUi"
      :autofocus="autofocus"
      aria-label="Search"
      role="combobox"
      aria-autocomplete="list"
      :aria-expanded="open"
      :aria-controls="listId"
      :aria-activedescendant="active >= 0 && items[active] ? optionId(items[active]!.key) : undefined"
      autocomplete="off"
      @focus="onFocus"
      @blur="onBlur"
      @keydown="onKeydown"
    />

    <div
      v-if="open"
      :id="listId"
      role="listbox"
      class="text-left bg-white dark:bg-old-neutral-900 text-old-neutral-900 dark:text-white rounded-xl overflow-hidden"
      :class="inline ? 'mt-3' : 'absolute left-0 right-0 top-full mt-2 z-50 shadow-2xl border border-old-neutral-200 dark:border-old-neutral-800 max-h-[70vh] overflow-y-auto'"
      @mousedown.prevent
    >
      <!-- Empty field: recent searches and recently played -->
      <template v-if="showingRecent">
        <div v-if="recent.length" class="py-1">
          <div class="flex items-center justify-between px-4 pt-2 pb-1">
            <span class="text-xs font-semibold uppercase tracking-wide text-old-neutral-500">Recent searches</span>
            <button type="button" class="text-xs text-old-neutral-500 hover:text-old-neutral-800 dark:hover:text-white" @click="clearRecent">Clear</button>
          </div>
          <div
            v-for="q in recent"
            :id="optionId(`q-${q}`)"
            :key="q"
            role="option"
            :aria-selected="items[active]?.key === `q-${q}`"
            class="flex items-center gap-3 px-4 py-2 cursor-pointer"
            :class="items[active]?.key === `q-${q}` ? 'bg-old-neutral-100 dark:bg-old-neutral-800' : 'hover:bg-old-neutral-100 dark:hover:bg-old-neutral-800'"
            @mouseenter="active = indexOf(`q-${q}`)"
            @click="select(items[indexOf(`q-${q}`)])"
          >
            <UIcon name="i-lucide-history" class="size-4 text-old-neutral-400 shrink-0" />
            <span class="truncate flex-1">{{ q }}</span>
            <button
              type="button"
              class="text-old-neutral-400 hover:text-old-neutral-800 dark:hover:text-white"
              :aria-label="`Remove ${q} from recent searches`"
              @click.stop="removeRecent(q)"
            >
              <UIcon name="i-heroicons-x-mark" class="size-4" />
            </button>
          </div>
        </div>

        <div v-if="recentTracks.length" class="py-1" :class="{ 'border-t border-old-neutral-100 dark:border-old-neutral-800': recent.length }">
          <div class="px-4 pt-2 pb-1 text-xs font-semibold uppercase tracking-wide text-old-neutral-500">Recently played</div>
          <div
            v-for="track in recentTracks"
            :id="optionId(`rt-${track.id}`)"
            :key="track.id"
            role="option"
            :aria-selected="items[active]?.key === `rt-${track.id}`"
            class="flex items-center gap-3 px-4 py-2 cursor-pointer"
            :class="items[active]?.key === `rt-${track.id}` ? 'bg-old-neutral-100 dark:bg-old-neutral-800' : 'hover:bg-old-neutral-100 dark:hover:bg-old-neutral-800'"
            @mouseenter="active = indexOf(`rt-${track.id}`)"
            @click="select(items[indexOf(`rt-${track.id}`)])"
          >
            <div class="size-10 shrink-0 rounded bg-old-neutral-200 dark:bg-old-neutral-700 overflow-hidden flex items-center justify-center">
              <CoverImage v-if="track.cover_url" :src="track.cover_url" :size="48" class="size-full object-cover" />
              <UIcon v-else name="i-heroicons-musical-note" class="size-5 text-old-neutral-400" />
            </div>
            <div class="min-w-0 flex-1">
              <div class="truncate font-medium">{{ track.title }}</div>
              <div class="truncate text-sm text-old-neutral-500"><TrackArtists :authors="track.authors" :linked="false" /></div>
            </div>
            <UIcon name="i-heroicons-play-solid" class="size-4 text-old-neutral-400" />
          </div>
        </div>
      </template>

      <div v-else-if="loading && isEmpty" class="px-4 py-3 text-sm text-old-neutral-500">Searching…</div>
      <div v-else-if="isEmpty && term" class="px-4 py-3 text-sm text-old-neutral-500">Nothing found for “{{ term }}”</div>

      <template v-else>
        <!-- Tracks: click plays -->
        <div v-if="results.tracks.length" class="py-1">
          <div class="px-4 pt-2 pb-1 text-xs font-semibold uppercase tracking-wide text-old-neutral-500">Tracks</div>
          <div
            v-for="track in results.tracks"
            :id="optionId(`t-${track.id}`)"
            :key="track.id"
            role="option"
            :aria-selected="items[active]?.key === `t-${track.id}`"
            class="flex items-center gap-3 px-4 py-2 cursor-pointer"
            :class="items[active]?.key === `t-${track.id}` ? 'bg-old-neutral-100 dark:bg-old-neutral-800' : 'hover:bg-old-neutral-100 dark:hover:bg-old-neutral-800'"
            @mouseenter="active = indexOf(`t-${track.id}`)"
            @click="select(items[indexOf(`t-${track.id}`)])"
          >
            <div class="size-10 shrink-0 rounded bg-old-neutral-200 dark:bg-old-neutral-700 overflow-hidden flex items-center justify-center">
              <CoverImage v-if="track.cover_url" :src="track.cover_url" :size="48" class="size-full object-cover" />
              <UIcon v-else name="i-heroicons-musical-note" class="size-5 text-old-neutral-400" />
            </div>
            <div class="min-w-0 flex-1">
              <div class="truncate font-medium">{{ track.title }}</div>
              <div class="truncate text-sm text-old-neutral-500"><TrackArtists :authors="track.authors" :linked="false" /></div>
            </div>
            <UIcon name="i-heroicons-play-solid" class="size-4 text-old-neutral-400" />
          </div>
        </div>

        <!-- Artists / albums / playlists: click opens the page -->
        <div v-if="results.artists.length" class="py-1 border-t border-old-neutral-100 dark:border-old-neutral-800">
          <div class="px-4 pt-2 pb-1 text-xs font-semibold uppercase tracking-wide text-old-neutral-500">Artists</div>
          <div
            v-for="a in results.artists"
            :id="optionId(`a-${a.id}`)"
            :key="a.id"
            role="option"
            :aria-selected="items[active]?.key === `a-${a.id}`"
            class="flex items-center gap-3 px-4 py-2 cursor-pointer"
            :class="items[active]?.key === `a-${a.id}` ? 'bg-old-neutral-100 dark:bg-old-neutral-800' : 'hover:bg-old-neutral-100 dark:hover:bg-old-neutral-800'"
            @mouseenter="active = indexOf(`a-${a.id}`)"
            @click="select(items[indexOf(`a-${a.id}`)])"
          >
            <UAvatar :src="a.avatar_url ?? undefined" :alt="artistName(a)" size="md" />
            <span class="truncate font-medium">{{ artistName(a) }}</span>
          </div>
        </div>

        <div v-if="results.albums.length" class="py-1 border-t border-old-neutral-100 dark:border-old-neutral-800">
          <div class="px-4 pt-2 pb-1 text-xs font-semibold uppercase tracking-wide text-old-neutral-500">Albums</div>
          <div
            v-for="a in results.albums"
            :id="optionId(`al-${a.id}`)"
            :key="a.id"
            role="option"
            :aria-selected="items[active]?.key === `al-${a.id}`"
            class="flex items-center gap-3 px-4 py-2 cursor-pointer"
            :class="items[active]?.key === `al-${a.id}` ? 'bg-old-neutral-100 dark:bg-old-neutral-800' : 'hover:bg-old-neutral-100 dark:hover:bg-old-neutral-800'"
            @mouseenter="active = indexOf(`al-${a.id}`)"
            @click="select(items[indexOf(`al-${a.id}`)])"
          >
            <div class="size-10 shrink-0 rounded bg-old-neutral-200 dark:bg-old-neutral-700 overflow-hidden flex items-center justify-center">
              <CoverImage v-if="a.cover_url" :src="a.cover_url" :size="48" class="size-full object-cover" />
              <UIcon v-else name="i-lucide-disc-3" class="size-5 text-old-neutral-400" />
            </div>
            <div class="min-w-0 flex-1">
              <div class="truncate font-medium">{{ a.title }}</div>
              <div v-if="a.owner?.username" class="truncate text-sm text-old-neutral-500">Album · {{ a.owner.username }}</div>
            </div>
          </div>
        </div>

        <div v-if="results.playlists.length" class="py-1 border-t border-old-neutral-100 dark:border-old-neutral-800">
          <div class="px-4 pt-2 pb-1 text-xs font-semibold uppercase tracking-wide text-old-neutral-500">Playlists</div>
          <div
            v-for="p in results.playlists"
            :id="optionId(`p-${p.id}`)"
            :key="p.id"
            role="option"
            :aria-selected="items[active]?.key === `p-${p.id}`"
            class="flex items-center gap-3 px-4 py-2 cursor-pointer"
            :class="items[active]?.key === `p-${p.id}` ? 'bg-old-neutral-100 dark:bg-old-neutral-800' : 'hover:bg-old-neutral-100 dark:hover:bg-old-neutral-800'"
            @mouseenter="active = indexOf(`p-${p.id}`)"
            @click="select(items[indexOf(`p-${p.id}`)])"
          >
            <div class="size-10 shrink-0 rounded bg-old-neutral-200 dark:bg-old-neutral-700 overflow-hidden flex items-center justify-center">
              <CoverImage v-if="p.cover_url" :src="p.cover_url" :size="48" class="size-full object-cover" />
              <UIcon v-else name="i-lucide-list-music" class="size-5 text-old-neutral-400" />
            </div>
            <div class="min-w-0 flex-1">
              <div class="truncate font-medium">{{ p.name }}</div>
              <div v-if="p.owner?.username" class="truncate text-sm text-old-neutral-500">Playlist · {{ p.owner.username }}</div>
            </div>
          </div>
        </div>
      </template>

      <div
        v-if="!showingRecent"
        :id="optionId('all')"
        role="option"
        :aria-selected="items[active]?.key === 'all'"
        class="px-4 py-3 text-sm font-medium cursor-pointer border-t border-old-neutral-100 dark:border-old-neutral-800 text-green-600 dark:text-green-400"
        :class="items[active]?.key === 'all' ? 'bg-old-neutral-100 dark:bg-old-neutral-800' : 'hover:bg-old-neutral-100 dark:hover:bg-old-neutral-800'"
        @mouseenter="active = indexOf('all')"
        @click="select(items[indexOf('all')])"
      >
        Show all results for “{{ text.trim() }}”
      </div>
    </div>
  </form>
</template>
