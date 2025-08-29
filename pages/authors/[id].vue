<template>


  <div v-if="isLoading">
    <div class="flex justify-center items-center py-20">
      <UIcon name="i-heroicons-arrow-path" class="animate-spin w-12 h-12 text-gray-500"/>
    </div>
  </div>
  <div v-else>
    <div>
      <div>
        <div class="text-6xl font-bold ">{{ author?.name }}</div>
      </div>
      <div class="text-xl">Tracks</div>
      <div class="flex flex-col gap-3">
        <div
            v-for="(track, index) in tracks"
            :key="track.id"
            class="flex flex-row gap-2 p-1 rounded-xl hover:bg-gray-200 transition"
        >
          <div class="flex justify-center items-center text-gray-500 w-6">{{ index + 1 }}</div>
          <div class="flex justify-center items-center shadow aspect-square rounded-lg w-12">
            <img v-if="track?.cover_url" :src="track.cover_url" class="text-gray-400 rounded-lg" alt="Cover">
            <UIcon v-else name="i-heroicons-musical-note"/>
          </div>
          <div>
            <div class="font-semibold">{{ track.title }}</div>
            <div v-if="track?.authors" class="truncate whitespace-nowrap overflow-hidden">
              <span
                  v-for="(author, index) in track.authors"
                  :key="index"
                  class="text-sm text-gray-500"
              >
                <NuxtLink
                    :to="`/authors/${author.id}`"
                    class="text-sm hover:underline"
                >{{ author.name }}</NuxtLink>
                <span v-if="index < track.authors.length - 1">,&nbsp;</span>
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  </div>


</template>

<script setup lang="ts">

import type {SupabaseClient} from "@supabase/supabase-js";
import type {Author, TrackUI} from "@/types/global";

const route = useRoute()
const supabase: SupabaseClient<Database> = useSupabaseClient()

const author = ref<Author>()
const authorId = route.params.id

const tracks = ref<TrackUI[]>([])

const isLoading = ref(true)


const fetchAuthor = async () => {
  try {
    const {data, error} = await supabase
        .from('authors')
        .select('*')
        .eq('id', authorId)
        .single()
    author.value = data
    if (error) console.error(error)
  } catch (err) {
    console.error(err)
  } finally {
    isLoading.value = false
  }

}



const fetchTracks = async () => {
  isLoading.value = true
  try {
    const { data, error} = await supabase.from('tracks')
        .select(`
                    *,
                    track_authors!inner(
                      track_id
                    ),
                    authors(*)
                  `)
        .eq('track_authors.author_id', authorId)
    if (error) console.error(error)

    tracks.value = data ?? [];
  } catch (error) {
    console.error(error)
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  void fetchAuthor()
  void fetchTracks()
})

</script>

<style scoped>

</style>