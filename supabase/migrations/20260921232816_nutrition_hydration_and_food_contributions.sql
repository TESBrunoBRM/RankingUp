insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'food-evidence',
  'food-evidence',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = false,
  file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

create table if not exists public.water_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  log_date date not null,
  amount_ml smallint not null default 250 check (amount_ml between 50 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists water_logs_user_date_idx
  on public.water_logs (user_id, log_date, created_at);

create table if not exists public.food_scan_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  image_path text not null unique,
  mode text not null check (mode in ('meal', 'nutrition_label')),
  food_name text not null check (char_length(food_name) between 2 and 120),
  brand_name text,
  serving_amount numeric(10, 2) not null check (serving_amount > 0),
  serving_unit text not null check (serving_unit in ('g', 'ml', 'oz', 'unidad', 'porcion')),
  calories numeric(10, 2) not null check (calories >= 0),
  protein numeric(10, 2) not null check (protein >= 0),
  carbs numeric(10, 2) not null check (carbs >= 0),
  fat numeric(10, 2) not null check (fat >= 0),
  confidence numeric(4, 3) not null check (confidence between 0 and 1),
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists food_scan_analyses_user_created_idx
  on public.food_scan_analyses (user_id, created_at desc);

create table if not exists public.food_submissions (
  id uuid primary key default gen_random_uuid(),
  submitted_by uuid not null references public.profiles(id) on delete cascade,
  scan_analysis_id uuid references public.food_scan_analyses(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  food_name text not null check (char_length(food_name) between 2 and 120),
  brand_name text,
  barcode text,
  serving_amount numeric(10, 2) not null check (serving_amount > 0),
  serving_unit text not null check (serving_unit in ('g', 'ml', 'oz', 'unidad', 'porcion')),
  calories numeric(10, 2) not null check (calories >= 0),
  protein numeric(10, 2) not null check (protein >= 0),
  carbs numeric(10, 2) not null check (carbs >= 0),
  fat numeric(10, 2) not null check (fat >= 0),
  image_path text not null,
  source_mode text not null check (source_mode in ('nutrition_label', 'ai_estimate')),
  submitter_notes text,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists food_submissions_status_created_idx
  on public.food_submissions (status, created_at);
create index if not exists food_submissions_submitter_idx
  on public.food_submissions (submitted_by, created_at desc);
create unique index if not exists food_submissions_approved_barcode_idx
  on public.food_submissions (barcode)
  where status = 'approved' and barcode is not null and barcode <> '';

alter table public.water_logs enable row level security;
alter table public.food_scan_analyses enable row level security;
alter table public.food_submissions enable row level security;

revoke all on table public.water_logs from anon, authenticated;
revoke all on table public.food_scan_analyses from anon, authenticated;
revoke all on table public.food_submissions from anon, authenticated;
grant select, insert, delete on table public.water_logs to service_role;
grant select, insert, delete on table public.food_scan_analyses to service_role;
grant select, insert, update on table public.food_submissions to service_role;

drop policy if exists "Backend only water logs" on public.water_logs;
create policy "Backend only water logs" on public.water_logs
  for all to anon, authenticated using (false) with check (false);

drop policy if exists "Backend only food scan analyses" on public.food_scan_analyses;
create policy "Backend only food scan analyses" on public.food_scan_analyses
  for all to anon, authenticated using (false) with check (false);

drop policy if exists "Backend only food submissions" on public.food_submissions;
create policy "Backend only food submissions" on public.food_submissions
  for all to anon, authenticated using (false) with check (false);
