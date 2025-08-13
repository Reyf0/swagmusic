<template>

  <UCard v-if="!isLoading">
    <template #header>
      <h1>{{ author?.name || 'Not found'}}</h1>
    </template>

    <div>{{ author?.description || 'Not found' }}</div>

    <template #footer>
      {{ author?.created_at || 'Not found'}}
    </template>

  </UCard>
  <div v-else class="flex justify-center items-center py-20">
    <UIcon name="i-heroicons-arrow-path" class="animate-spin w-8 h-8 text-gray-500" />
  </div>


</template>

<script setup lang="ts">

import type {SupabaseClient} from "@supabase/supabase-js";
import type {Author} from "@/types/global";

const route = useRoute()
const supabase: SupabaseClient<Database> = useSupabaseClient()

const author = ref<Author>()
const authorId = route.params.id

const isLoading = ref(true)


const fetchAuthor = async () => {
  try {
    const { data, error } = await supabase
        .from('authors')
        .select('*')
        .eq('id', authorId)
        .single()
    author.value = data
  }
  catch (err) {
    console.error(err)
  } finally {
    isLoading.value = false
  }

}

onMounted(() => fetchAuthor())

</script>

<style scoped>

</style>