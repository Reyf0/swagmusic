import type { SupabaseClient } from "@supabase/supabase-js";
import type {Database, TrackUI} from "@/types/global"

interface GetTracksOptions {
    match?: Record<string, any>
    ilike?: { column: string; pattern: string}
    limit?: number
    offset?: number
    order?: { column: string; ascending?: boolean }
}

export const useTracks = () => {
    const supabase: SupabaseClient<Database> = useSupabaseClient();

    let controller: AbortController | null = null;

    /**
     * Нормализация трека для UI
     * @param track - Трек из базы данных
     * @returns Нормализованный трек
     */
    const normalizeTrack = (track: any): TrackUI => {
        // TODO Убрать поддержку старого формата когда будет возможность
        // const { track_authors, ...rest } = track;
        return {
            ...track,
            authors: track.track_authors?.map((link: any) => link.author) || [],
        };
    };

    /**
     * Получение треков из базы данных с возможностью фильтров, поиска и пагинации
     * @param options - Опции для фильтрации, поиска и пагинации
     * @returns Запрос к базе данных для получения треков
     */
    const fetchTracksFromDB = async (options: GetTracksOptions = {}) => {
        let query = supabase
            .from('tracks')
            .select(
                `
                    *,
                    track_authors(
                        *,
                        author:authors(*)
                    )
                `
            );

        if (options.match) {
            query = query.match(options.match)
        }

        if (options.ilike) {
            query = query.ilike(options.ilike.column, options.ilike.pattern)
        }

        if (options.limit) {
            query = query.limit(options.limit)
        }

        if (options.offset) {
            query = query.range(
                options.offset,
                (options.offset || 0) + (options.limit || 10) - 1
            );
        }

        if (options.order) {
            query = query.order(
                options.order.column,
                { ascending: options.order.ascending ?? true}
            )
        }

        return query;
    }

    /**
     * Получение треков с нормализацией и возможностью фильтрации, поиска и пагинации
     * @param options - Опции для фильтрации, поиска и пагинации
     * @returns Массив треков в формате TrackUI
     */
    const getTracks = async (options: GetTracksOptions = {}): Promise<TrackUI[]> => {
        try {
            // Abort previous request if it exists
            if (controller) controller.abort()
            controller = new AbortController()

            const { data, error } = await fetchTracksFromDB(options);

            if (error) throw error;

            return (data || []).map(normalizeTrack);
        } catch (error) {
            console.error('Error fetching tracks:', error);
            return [];
        }
    };

    return {
        getTracks,
    };
}