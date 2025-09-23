<script setup lang="ts">
import { reactive, ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { useSettingsStore } from '@/stores/settings'

const store = useSettingsStore()
const supabase = useSupabaseClient()
const user = useSupabaseUser()

const local = reactive({
  theme: 'system' as 'system'|'light'|'dark',
  locale: 'ru',
  notifications: { email: true, push: false }
})

const isSaving = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const savedSuccessfully = ref(false)

// безопасно прочитать значение из useColorMode()
function readColorModeSafe(): string | null {
  try {
    // @ts-ignore
    const colorMode = typeof useColorMode !== 'undefined' ? useColorMode?.() : null
    if (colorMode) {
      // @ts-ignore
      return (colorMode.preference ?? colorMode.value ?? null) as string | null
    }
  } catch (e) { }
  return null
}

// при монтировании: приоритет — useColorMode(), затем store
onMounted(() => {
  const cm = readColorModeSafe()
  if (cm) {
    local.theme = cm === 'null' ? 'system' : (cm as any)
  } else {
    local.theme = store.settings.theme ?? 'system'
  }
  local.locale = store.settings.locale ?? 'ru'
  local.notifications = { ...store.settings.notifications }

  // применим предпросмотр сразу
  store.previewTheme(local.theme)
})

// если кто-то (кнопка) меняет useColorMode() в другом месте — обновим селект
try {
  // @ts-ignore
  const colorMode = typeof useColorMode !== 'undefined' ? useColorMode?.() : null
  if (colorMode) {
    watch(
        () => (colorMode.preference ?? colorMode.value),
        (val) => {
          if (val) local.theme = val === 'null' ? 'system' : val
        }
    )
  }
} catch (e) { /* ignore */ }

// при изменении селекта — предпросмотр (независимо от сохранения)
watch(() => local.theme, (t) => {
  store.previewTheme(t)
})

// onBeforeUnmount: откат, если не сохранили
onBeforeUnmount(() => {
  if (!savedSuccessfully.value) {
    store.restoreTheme()
  }
})

async function save() {
  isSaving.value = true
  errorMessage.value = ''
  successMessage.value = ''
  try {
    await store.saveSettings({ ...local }, user.value, supabase)
    savedSuccessfully.value = true
    successMessage.value = 'Saved successfully'
  } catch (e) {
    console.error(e)
    errorMessage.value = 'Failed to save settings'
  } finally {
    isSaving.value = false
  }
}

function cancel() {
  local.theme = store.settings.theme ?? 'system'
  local.locale = store.settings.locale ?? 'ru'
  local.notifications = { ...store.settings.notifications }
  store.restoreTheme()
}
</script>

<template>
  <div class="bg-old-neutral-50 dark:bg-old-neutral-900 max-w-md mx-auto p-6 rounded-lg shadow-md mt-10">
    <h1 class="dark:text-white text-2xl font-bold mb-6 text-center">Settings</h1>

    <div class="space-y-4">
      <div>
        <label for="theme" class="block text-sm font-medium dark:text-white">Theme</label>
        <select
            id="theme"
            v-model="local.theme"
            class="mt-1 block w-full px-3 py-2 rounded-md shadow-sm dark:text-old-neutral-400 border border-old-neutral-200 dark:border-old-neutral-700 bg-white dark:bg-old-neutral-800 focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="system">System</option>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </div>

      <!-- notifications -->
      <div>
        <label class="block text-sm font-medium dark:text-white mb-1">Email notifications</label>
        <div class="flex items-center gap-2 px-3 py-2 rounded-md shadow-sm border border-old-neutral-200 dark:border-old-neutral-700 bg-white dark:bg-old-neutral-800">
          <input id="notif-email" type="checkbox" v-model="local.notifications.email" class="h-4 w-4 text-green-500 focus:ring-green-500 border-gray-300 rounded" />
          <label for="notif-email" class="text-sm dark:text-old-neutral-400 select-none">Receive updates by email</label>
        </div>
      </div>

      <div class="flex gap-3 mt-6">
        <button @click="save" :disabled="isSaving" class="flex-1 py-2 px-4 rounded-full shadow-sm text-sm font-medium text-white bg-green-500 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50">
          <span v-if="isSaving">Saving...</span><span v-else>Save</span>
        </button>
        <button @click="cancel" class="flex-1 py-2 px-4 rounded-full shadow-sm text-sm font-medium border border-old-neutral-300 dark:border-old-neutral-600 bg-white dark:bg-old-neutral-800 dark:text-white hover:bg-old-neutral-100 dark:hover:bg-old-neutral-700">
          Cancel
        </button>
      </div>

      <div v-if="errorMessage" class="text-red-500 text-sm">{{ errorMessage }}</div>
      <div v-if="successMessage" class="text-green-500 text-sm">{{ successMessage }}</div>
    </div>
  </div>
</template>