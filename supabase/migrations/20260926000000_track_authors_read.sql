-- Everyone can see who is credited on a track (approved credits only).
-- Without this, tracks_with_authors / track_authors embeds return no artists and the UI shows "Unknown artist".
create policy "Approved credits are public"
    on public.track_authors for select
    using (status = 'approved');

-- Pending / declined credits are visible to the invited person, the inviter and the track owner (Studio invites).
create policy "Involved users see their credits"
    on public.track_authors for select
    to authenticated
    using (
        profile_id = (select auth.uid())
        or invited_by = (select auth.uid())
        or exists (select 1 from public.tracks t where t.id = track_id and t.user_id = (select auth.uid()))
    );
