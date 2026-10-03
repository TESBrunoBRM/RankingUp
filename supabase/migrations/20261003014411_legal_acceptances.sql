create table if not exists public.legal_acceptances (
  user_id uuid not null references auth.users(id) on delete cascade,
  document_version text not null,
  accepted_at timestamptz not null default now(),
  primary key (user_id, document_version)
);

alter table public.legal_acceptances enable row level security;
revoke all on public.legal_acceptances from anon, authenticated;
grant select, insert, update on public.legal_acceptances to service_role;

create policy "Backend only legal acceptances" on public.legal_acceptances
  for all to anon, authenticated using (false) with check (false);
