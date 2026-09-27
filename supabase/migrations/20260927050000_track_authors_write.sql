-- Who may create / change / remove track credits (track_authors).
-- Replaces the old write rules, which let
--   * anyone credit themselves as an accepted author of ANY track,
--   * anyone create invites on tracks that aren't theirs,
--   * track owners set a co-author's status (accept on their behalf), and invitees edit
--     any column of their row (e.g. move it to another track).
-- Admins go through the server API (service role), which bypasses these rules.

drop policy "track_authors_insert_invite" on public.track_authors;
drop policy "track_authors_update_invited" on public.track_authors;
drop policy "track_authors_with_check" on public.track_authors;

-- The track owner credits themselves (accepted) and invites others (pending); only on their own tracks.
create policy "Owners credit themselves and invite co-authors" on public.track_authors
    for insert to authenticated
    with check (
        exists (select 1 from public.tracks t where t.id = track_id and t.user_id = (select auth.uid()))
        and (
            (profile_id = (select auth.uid()) and status = 'accepted')
            or (profile_id <> (select auth.uid()) and status = 'pending' and invited_by = (select auth.uid()))
        )
    );

-- Only the credited person answers the invite (or later withdraws / re-accepts).
create policy "Invitees answer their invites" on public.track_authors
    for update to authenticated
    using (profile_id = (select auth.uid()))
    with check (
        profile_id = (select auth.uid())
        and status in ('accepted', 'rejected')
        and responded_at is not null
    );

-- Clients may change only the answer, not which track / person / order the credit is for.
revoke update on public.track_authors from anon, authenticated;
grant update (status, responded_at) on public.track_authors to authenticated;

-- The track owner can remove credits from their track; anyone can remove their own credit.
create policy "Owners and credited users remove credits" on public.track_authors
    for delete to authenticated
    using (
        profile_id = (select auth.uid())
        or exists (select 1 from public.tracks t where t.id = track_id and t.user_id = (select auth.uid()))
    );
