import type { MergeDeep } from 'type-fest'
import type { Database as DatabaseGenerated } from '@/types/database.types'

export type Database = MergeDeep<
    DatabaseGenerated,
    {
        public: {
            Views: {
                albums_with_count: {
                    Row: {
                        id: string
                        title: string
                        description: string | null
                        cover_url: string | null
                        created_at: string
                        user_id: string
                        username: string
                        email: string
                        track_count: number
                    }
                }
            }
        }
    }
>
