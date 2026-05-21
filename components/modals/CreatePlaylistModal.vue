<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'

const user = useSupabaseUser()
const { createPlaylist } = usePlaylistsApi()

const isOpen = ref(false)
const name = ref('')
const description = ref('')
const loading = ref(false)

function openModal() {
  isOpen.value = true
}

function closeModal() {
  isOpen.value = false
  name.value = ''
  description.value = ''
  loading.value = false
}

async function onCreatePlaylist() {
  if (!user.value) return
  if (!name.value.trim()) return

  loading.value = true

  const playlist = await createPlaylist({
    name: name.value.trim(),
    description: description.value.trim(),
    userId: user.value.id,
  })

  loading.value = false

  if (!playlist) return

  closeModal()
  await navigateTo(`/playlist/${playlist.id}`)
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && isOpen.value) {
    closeModal()
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div class="p-4">
    <UButton
        class="w-full bg-old-neutral-800 hover:bg-old-neutral-700 text-white"
        @click="openModal"
    >
      <UIcon name="i-heroicons-plus" class="w-4 h-4 mr-2" />
      Create Playlist
    </UButton>
  </div>

  <Teleport to="body">
    <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
    >
      <div
          v-if="isOpen"
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          @click.self="closeModal"
      >
        <Transition
            enter-active-class="transition duration-200 ease-out"
            enter-from-class="opacity-0 scale-95 translate-y-2"
            enter-to-class="opacity-100 scale-100 translate-y-0"
            leave-active-class="transition duration-150 ease-in"
            leave-from-class="opacity-100 scale-100 translate-y-0"
            leave-to-class="opacity-0 scale-95 translate-y-2"
        >
          <div
              v-if="isOpen"
              class="w-full max-w-md rounded-2xl border border-white/10 bg-old-neutral-900 p-5 shadow-2xl"
          >
            <div class="mb-5 flex items-center justify-between">
              <h2 class="text-lg font-semibold text-white">
                Create Playlist
              </h2>

              <button
                  type="button"
                  class="rounded-lg p-2 text-white/70 hover:bg-white/10 hover:text-white"
                  @click="closeModal"
              >
                <UIcon name="i-heroicons-x-mark" class="h-5 w-5" />
              </button>
            </div>

            <div class="space-y-4">
              <UFormGroup label="Name">
                <UInput
                    v-model="name"
                    placeholder="My playlist"
                    class="w-full"
                />
              </UFormGroup>

              <UFormGroup label="Description">
                <UTextarea
                    v-model="description"
                    placeholder="Optional description"
                    class="w-full"
                />
              </UFormGroup>
            </div>

            <div class="mt-6 flex justify-end gap-2">
              <UButton
                  color="gray"
                  variant="ghost"
                  @click="closeModal"
              >
                Cancel
              </UButton>

              <UButton
                  :loading="loading"
                  :disabled="!name.trim()"
                  @click="onCreatePlaylist"
              >
                Create
              </UButton>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>