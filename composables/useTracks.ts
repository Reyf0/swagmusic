import type { SupabaseClient } from "@supabase/supabase-js";

export const useTracks = () => {
    const supabase: SupabaseClient<Database> = useSupabaseClient();
    const { user } = useSupabaseUser();

    let controller: AbortController | null = null;

    /**
     * Общий fetch треков с возможностью фильтров, поиска, пагинации
     * params: { match, ilike, limit, offset, order }
     */
    const getTracks = async (options: {
        match?: Record<string, any>
        ilike?: { column: string; pattern: string}
        limit?: number
        offset?: number
        order?: { column: string; ascending?: boolean }
    } = {}) => {
        try {
            // Abort previous request if it exists
            if (controller) controller.abort()
            controller = new AbortController()
            // TODO Finish this function to support filtering, searching, pagination
            const { data, error } = await supabase
                .from('tracks')
                .select('*, ' +
                    'track_authors(*, author:authors(*))')
                .limit(1000)

            if (error) throw error;

            return data;
        } catch (error) {
            console.error('Error fetching tracks:', error);
            return [];
        }
    };


    return {
        getTracks,
    };
}