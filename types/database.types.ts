export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      albums: {
        Row: {
          author_id: string | null
          cover_url: string | null
          created_at: string | null
          description: string | null
          id: string
          title: string
          user_id: string | null
        }
        Insert: {
          author_id?: string | null
          cover_url?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          title: string
          user_id?: string | null
        }
        Update: {
          author_id?: string | null
          cover_url?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          title?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "albums_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      genres: {
        Row: {
          created_at: string | null
          id: string
          name: string
          slug: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          slug?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          slug?: string | null
        }
        Relationships: []
      }
      likes: {
        Row: {
          created_at: string | null
          id: string
          target_id: string
          target_type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          target_id: string
          target_type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          target_id?: string
          target_type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "likes_user_id_fkey1"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      play_history: {
        Row: {
          id: number
          played_at: string
          track_id: string
          user_id: string
        }
        Insert: {
          id?: never
          played_at?: string
          track_id: string
          user_id: string
        }
        Update: {
          id?: never
          played_at?: string
          track_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "play_history_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "play_history_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks_with_authors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "play_history_user_id_fkey1"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      playlist_tracks: {
        Row: {
          added_at: string | null
          id: number
          playlist_id: string
          position: number
          track_id: string
        }
        Insert: {
          added_at?: string | null
          id?: never
          playlist_id: string
          position: number
          track_id: string
        }
        Update: {
          added_at?: string | null
          id?: never
          playlist_id?: string
          position?: number
          track_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "playlist_tracks_playlist_id_fkey"
            columns: ["playlist_id"]
            isOneToOne: false
            referencedRelation: "playlists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "playlist_tracks_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "playlist_tracks_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks_with_authors"
            referencedColumns: ["id"]
          },
        ]
      }
      playlists: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          metadata: Json | null
          name: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          name: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          name?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "playlists_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          is_admin: boolean | null
          slug: string | null
          updated_at: string | null
          username: string | null
          website: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          is_admin?: boolean | null
          slug?: string | null
          updated_at?: string | null
          username?: string | null
          website?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          is_admin?: boolean | null
          slug?: string | null
          updated_at?: string | null
          username?: string | null
          website?: string | null
        }
        Relationships: []
      }
      search_logs: {
        Row: {
          created_at: string | null
          id: number
          ip: unknown | null
          normalized_query: string | null
          query: string | null
          results_count: number | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          ip?: unknown | null
          normalized_query?: string | null
          query?: string | null
          results_count?: number | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          ip?: unknown | null
          normalized_query?: string | null
          query?: string | null
          results_count?: number | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      track_authors: {
        Row: {
          id: number
          invited_at: string | null
          invited_by: string | null
          order_index: number | null
          profile_id: string
          responded_at: string | null
          role: string | null
          status: string
          track_id: string
        }
        Insert: {
          id?: number
          invited_at?: string | null
          invited_by?: string | null
          order_index?: number | null
          profile_id: string
          responded_at?: string | null
          role?: string | null
          status?: string
          track_id: string
        }
        Update: {
          id?: number
          invited_at?: string | null
          invited_by?: string | null
          order_index?: number | null
          profile_id?: string
          responded_at?: string | null
          role?: string | null
          status?: string
          track_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "track_authors_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "track_authors_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "track_authors_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "track_authors_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks_with_authors"
            referencedColumns: ["id"]
          },
        ]
      }
      track_embeddings: {
        Row: {
          created_at: string | null
          embedding: string | null
          model: string | null
          track_id: string
        }
        Insert: {
          created_at?: string | null
          embedding?: string | null
          model?: string | null
          track_id: string
        }
        Update: {
          created_at?: string | null
          embedding?: string | null
          model?: string | null
          track_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "track_embeddings_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: true
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "track_embeddings_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: true
            referencedRelation: "tracks_with_authors"
            referencedColumns: ["id"]
          },
        ]
      }
      track_genres: {
        Row: {
          genre_id: string
          track_id: string
        }
        Insert: {
          genre_id: string
          track_id: string
        }
        Update: {
          genre_id?: string
          track_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "track_genres_genre_id_fkey"
            columns: ["genre_id"]
            isOneToOne: false
            referencedRelation: "genres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "track_genres_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "track_genres_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks_with_authors"
            referencedColumns: ["id"]
          },
        ]
      }
      tracks: {
        Row: {
          album_id: string | null
          audio_url: string | null
          cover_url: string | null
          created_at: string | null
          description: string | null
          duration_seconds: number | null
          id: string
          language: string | null
          likes_count: number
          metadata: Json | null
          search_vector: unknown | null
          slug: string | null
          title: string
          title_normalized: string | null
          tsv_multi: unknown | null
          user_id: string | null
        }
        Insert: {
          album_id?: string | null
          audio_url?: string | null
          cover_url?: string | null
          created_at?: string | null
          description?: string | null
          duration_seconds?: number | null
          id?: string
          language?: string | null
          likes_count?: number
          metadata?: Json | null
          search_vector?: unknown | null
          slug?: string | null
          title: string
          title_normalized?: string | null
          tsv_multi?: unknown | null
          user_id?: string | null
        }
        Update: {
          album_id?: string | null
          audio_url?: string | null
          cover_url?: string | null
          created_at?: string | null
          description?: string | null
          duration_seconds?: number | null
          id?: string
          language?: string | null
          likes_count?: number
          metadata?: Json | null
          search_vector?: unknown | null
          slug?: string | null
          title?: string
          title_normalized?: string | null
          tsv_multi?: unknown | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tracks_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "albums"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tracks_user_id_fkey1"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_recommendations: {
        Row: {
          candidates: Json
          created_at: string | null
          expires_at: string | null
          strategy: string
          user_id: string
        }
        Insert: {
          candidates: Json
          created_at?: string | null
          expires_at?: string | null
          strategy: string
          user_id: string
        }
        Update: {
          candidates?: Json
          created_at?: string | null
          expires_at?: string | null
          strategy?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      tracks_with_authors: {
        Row: {
          album_id: string | null
          audio_url: string | null
          authors: Json | null
          cover_url: string | null
          created_at: string | null
          duration_seconds: number | null
          id: string | null
          likes_count: number | null
          title: string | null
          user_id: string | null
        }
        Insert: {
          album_id?: string | null
          audio_url?: string | null
          authors?: never
          cover_url?: string | null
          created_at?: string | null
          duration_seconds?: number | null
          id?: string | null
          likes_count?: number | null
          title?: string | null
          user_id?: string | null
        }
        Update: {
          album_id?: string | null
          audio_url?: string | null
          authors?: never
          cover_url?: string | null
          created_at?: string | null
          duration_seconds?: number | null
          id?: string | null
          likes_count?: number | null
          title?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tracks_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "albums"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tracks_user_id_fkey1"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      _get_authors_for_track: {
        Args: { _track_id: string }
        Returns: Json
      }
      _track_has_genre: {
        Args: { p_genre_ids: string[]; p_track_id: string }
        Returns: boolean
      }
      autocomplete_tracks: {
        Args: { p_limit?: number; p_q: string }
        Returns: {
          id: string
          score: number
          title: string
        }[]
      }
      get_listen_stats_by_day: {
        Args: Record<PropertyKey, never>
        Returns: {
          day: string
          total_listens: number
        }[]
      }
      get_popular_tracks: {
        Args: { p_limit?: number }
        Returns: {
          plays: number
          track_id: string
        }[]
      }
      get_related_tracks: {
        Args: { p_limit?: number; p_seed_track_id: string }
        Returns: {
          co_plays: number
          track_id: string
        }[]
      }
      get_tracks_by_embedding: {
        Args: { p_embedding: number[]; p_exclude?: string[]; p_limit?: number }
        Returns: {
          distance: number
          track_id: string
        }[]
      }
      get_tracks_feed: {
        Args: {
          p_after_created_at?: string
          p_after_id?: string
          p_limit?: number
        }
        Returns: {
          audio_url: string
          cover_url: string
          created_at: string
          duration_seconds: number
          id: string
          title: string
          user_id: string
        }[]
      }
      get_tracks_search: {
        Args: {
          p_genre_ids?: string[]
          p_language?: string
          p_limit?: number
          p_offset?: number
          p_q?: string
        }
        Returns: {
          audio_url: string
          authors: Json
          cover_url: string
          duration_seconds: number
          id: string
          score: number
          title: string
          user_id: string
        }[]
      }
      get_tracks_with_authors: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: {
          audio_url: string
          authors: Json
          cover_url: string
          duration_seconds: number
          id: string
          title: string
          user_id: string
        }[]
      }
      get_tracks_with_likes: {
        Args: { p_user_id: string }
        Returns: {
          audio_url: string
          authors: Json
          cover_url: string
          id: string
          is_liked_by_user: boolean
          title: string
        }[]
      }
      get_trending: {
        Args: { p_days?: number; p_limit?: number }
        Returns: {
          plays: number
          track_id: string
        }[]
      }
      get_user_recent_authors: {
        Args: { p_limit?: number; p_user_id: string }
        Returns: {
          author_id: string
          avatar_url: string
          last_played: string
          name: string
          plays: number
        }[]
      }
      get_user_recent_playlists: {
        Args: { p_limit?: number; p_user_id: string }
        Returns: {
          last_played: string
          playlist_id: string
          plays: number
        }[]
      }
      get_user_recent_tracks: {
        Args: { p_after?: string; p_limit?: number; p_user_id: string }
        Returns: {
          last_played: string
          play_count: number
          track_id: string
        }[]
      }
      get_user_recent_tracks_full: {
        Args: { p_after?: string; p_limit?: number; p_user_id: string }
        Returns: {
          audio_url: string
          authors: Json
          cover_url: string
          duration_seconds: number
          id: string
          last_played: string
          play_count: number
          title: string
          user_id: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
