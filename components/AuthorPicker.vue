<script setup lang="ts">
import { ref, watch } from 'vue'
import { Combobox, ComboboxInput, ComboboxButton, ComboboxOptions, ComboboxOption } from '@headlessui/vue'
import { useDebounceFn } from '@vueuse/core'
import Draggable from 'vuedraggable'
import type { SupabaseClient } from '@supabase/supabase-js'
import type {Author} from "@/types/global";

const supabase: SupabaseClient<Database> = useSupabaseClient()

// Пропс: уже выбранные авторы
const props = defineProps<{
  modelValue: Author[]
}>()
const emit = defineEmits<{
  (e: 'update:modelValue', v: Author[]): void
}>()

// Локальный список выбранных
const selected = ref<Author[]>([...(props.modelValue || [])])
const singleSelection = ref<Author | null>(null) // для Combobox

// Поле ввода
const query = ref('')
const options = ref<Author[]>([])
const isLoading = ref(false)

// Запрос к Supabase (debounce 300 мс)
const search = useDebounceFn(async () => {
  if (!query.value) {
    options.value = []
    return
  }
  isLoading.value = true
  const { data, error } = await supabase
      .from('authors')
      .select('id, name')
      .ilike('name', `%${query.value}%`)
      .limit(10)
  options.value = data || []
  isLoading.value = false
  console.log("Data: " + data)
}, 300)

watch(query, () => {
  search()
})

// Когда меняется локальный selected - отдаём наверх
watch(selected, v => emit('update:modelValue', v), { deep: true})
watch(singleSelection, val => addAuthor(val))

// Удалить автора
function removeAuthor(idx: number) {
  selected.value.splice(idx, 1)
}

// Добавить выбранного автора
function addAuthor(val: Author) {
  if (val && !selected.value.find(a => a.id === val.id)) {
    selected.value.push(val)
  }
  singleSelection.value = null
  query.value = ''
}


</script>

<template>
  <div>
    <label class="block text-sm font-medium text-gray-700">Authors</label>
    <!-- Чипы + draggable -->
    <Draggable
      v-model="selected"
      item-key="id"
      class="flex flex-wrap gap-2 mb-2"
      handle=".handle"
    >
      <template #item="{ element, index }">
        <div class="flex items-center bg-gray-200 rounded px-2 py-1">
          <span class="handle cursor-move mr-1">☰</span>
          <span class="mr-2">{{ element.name }}</span>
          <button
              type="button"
              class="text-gray-600 hover:text-gray-800"
              @click="removeAuthor(index)">
            &times;
          </button>
        </div>
      </template>

    </Draggable>

    <!-- Комбобокс для поиска -->
    <Combobox v-model="singleSelection" by="id">
      <div class="relative">
        <ComboboxInput
          class="w-full border bg-gray-300 rounded-md px-3 py-2 focus: ring-blue-500 focus:border-blue-500"
          placeholder="Type to search authors..."
          @change="query = $event.target.value"
        />
        <transition
            enter-active-class="transition ease-out duration-100"
            enter-from-class="transform opacity-0 scale-95"
            enter-to-class="transform opacity-100 scale-100"
            leave-active-class="transition ease-in duration-75"
            leave-from-class="transform opacity-100 scale-100"
            leave-to-class="transform opacity-0 scale-95"
        >
          <ComboboxOptions
            v-if="options.length"
            class="absolute z-10 mt-1 w-full bg-white border bg-gray-300 rounden-md shadow-lg max-h-60 overflow-auto"
          >
            <ComboboxOption
                v-for="item in options"
                :key="item.id"
                :value="item"
            >
              <div class="px-3 py-2 cursor-pointer hover:bg-gray-100">
                {{ item.name}}
              </div>
            </ComboboxOption>

          </ComboboxOptions>

        </transition>
      </div>
    </Combobox>
  </div>
</template>

<style scoped>

</style>