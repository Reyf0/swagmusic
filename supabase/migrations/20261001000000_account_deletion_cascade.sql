-- Deleting an account (auth.users -> profiles, already cascading) failed for anyone who had
-- uploaded, liked or played something: these references to profiles had no ON DELETE rule.
-- Now deleting an account removes the person's content and activity with it, as the privacy
-- policy promises. Constraint names stay the same (queries use them as embed hints).
--
-- What goes with a deleted account:
--   tracks and albums they uploaded (tracks also drop out of other people's playlists and lose
--   their likes, play history and credits, which already cascade from tracks),
--   their likes, listening history, playlists (already), credits (already), recommendations.
-- What stays, without the link to them:
--   feedback they sent (already), search logs, invites they sent to other people's tracks.

alter table public.tracks drop constraint tracks_user_id_fkey1,
    add constraint tracks_user_id_fkey1 foreign key (user_id) references public.profiles (id) on delete cascade;

alter table public.albums drop constraint albums_user_id_fkey,
    add constraint albums_user_id_fkey foreign key (user_id) references public.profiles (id) on delete cascade;

alter table public.likes drop constraint likes_user_id_fkey1,
    add constraint likes_user_id_fkey1 foreign key (user_id) references public.profiles (id) on delete cascade;

alter table public.play_history drop constraint play_history_user_id_fkey1,
    add constraint play_history_user_id_fkey1 foreign key (user_id) references public.profiles (id) on delete cascade;

alter table public.track_authors drop constraint track_authors_invited_by_fkey,
    add constraint track_authors_invited_by_fkey foreign key (invited_by) references public.profiles (id) on delete set null;

-- A track could not be deleted at all once it had an embedding.
alter table public.track_embeddings drop constraint track_embeddings_track_id_fkey,
    add constraint track_embeddings_track_id_fkey foreign key (track_id) references public.tracks (id) on delete cascade;

-- These had no reference to the person at all, so their rows would have been left behind.
alter table public.user_recommendations
    add constraint user_recommendations_user_id_fkey foreign key (user_id) references public.profiles (id) on delete cascade;

alter table public.search_logs
    add constraint search_logs_user_id_fkey foreign key (user_id) references public.profiles (id) on delete set null;
