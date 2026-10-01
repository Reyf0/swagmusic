-- Tracks imported from Jamendo (scripts/import-jamendo.ts) keep the Jamendo track id in metadata.jamendo_id.
-- One row per Jamendo track, so a re-run or two imports at once never duplicate a track.
create unique index if not exists tracks_jamendo_id_key
    on public.tracks ((metadata->>'jamendo_id'))
    where metadata ? 'jamendo_id';
