-- Storage rules for the public buckets (tracks, covers, avatars).
-- Files stay publicly readable through their public URLs (the buckets are public);
-- these policies only control what signed-in users may upload and delete.

-- Anyone, even without signing in, could delete ANY audio file in the tracks bucket.
drop policy "delete" on storage.objects;

-- Anyone, even without signing in, could upload anything anywhere in the avatars bucket.
-- Signed-in users keep uploading to their own folder ("Give users access to own folder 1oj01fe_1").
drop policy "Anyone can upload an avatar." on storage.objects;

-- Signed-in users could upload to any bucket and any path. It was the only rule that let covers be uploaded,
-- so it is replaced by an own-folder rule for covers (tracks and avatars already have one).
drop policy "User can upload own files" on storage.objects;

create policy "Users upload covers to their own folder" on storage.objects
    for insert to authenticated
    with check (bucket_id = 'covers' and (select auth.uid())::text = (storage.foldername(name))[1]);

-- Deleting needs SELECT as well; covers had no SELECT rule, so users could never remove their old covers.
create policy "Owners see their covers" on storage.objects
    for select to authenticated
    using (bucket_id = 'covers' and owner_id = (select auth.uid())::text);

-- Owners can delete their own files, including older uploads that sit at the bucket root.
create policy "Owners delete their files" on storage.objects
    for delete to authenticated
    using (bucket_id in ('tracks', 'covers', 'avatars') and owner_id = (select auth.uid())::text);
