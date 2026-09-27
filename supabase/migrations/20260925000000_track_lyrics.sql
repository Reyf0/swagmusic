-- Plain-text lyrics for a track (shown in the player's Lyrics view, edited in Upload / Studio).
alter table public.tracks add column if not exists lyrics text;

comment on column public.tracks.lyrics is 'Plain-text lyrics; null when not provided.';
