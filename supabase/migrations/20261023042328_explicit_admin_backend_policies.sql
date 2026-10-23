-- Explicit deny policies document the backend-only access model and retain
-- default-deny protection even if a client grant is accidentally added later.
create policy "Backend only content reports" on public.content_reports
  for all to anon, authenticated using (false) with check (false);
create policy "Backend only bug reports" on public.bug_reports
  for all to anon, authenticated using (false) with check (false);
create policy "Backend only post moderation" on public.post_moderation
  for all to anon, authenticated using (false) with check (false);
create policy "Backend only admin audit" on public.admin_action_log
  for all to anon, authenticated using (false) with check (false);
