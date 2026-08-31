-- ---------------------------------------------------------------------------
-- Catalogo de ejercicios basado en hasaneyldrm/exercises-dataset (1.324 ejercicios).
-- Los datos (nombres, categorias, musculos, instrucciones) son MIT.
-- La media (gif/thumbnail) es (c) Gym visual y NO se redistribuye aqui: solo
-- guardamos la ruta relativa y la atribucion. La URL base es configurable en la
-- API (EXERCISE_MEDIA_BASE_URL) para poder apuntar a media con licencia propia.
-- ---------------------------------------------------------------------------

create extension if not exists pg_trgm with schema extensions;

alter table public.exercises
  add column if not exists body_part text,
  add column if not exists equipment text,
  add column if not exists target text,
  add column if not exists secondary_muscles text[] not null default '{}',
  add column if not exists instructions_es text,
  add column if not exists instructions_en text,
  add column if not exists steps_es text[] not null default '{}',
  add column if not exists steps_en text[] not null default '{}',
  add column if not exists media_id text,
  add column if not exists image_path text,
  add column if not exists gif_path text,
  add column if not exists attribution text,
  add column if not exists source text not null default 'legacy';

-- Columna de busqueda: nombre + ejes de filtrado, para un solo indice trigram.
alter table public.exercises
  drop column if exists search_text;

alter table public.exercises
  add column search_text text
  generated always as (
    lower(
      coalesce(name, '') || ' ' ||
      coalesce(target, '') || ' ' ||
      coalesce(body_part, '') || ' ' ||
      coalesce(equipment, '') || ' ' ||
      coalesce(muscle_group, '')
    )
  ) stored;

create index if not exists exercises_search_text_trgm_idx
  on public.exercises using gin (search_text extensions.gin_trgm_ops);

create index if not exists exercises_body_part_idx on public.exercises (body_part);
create index if not exists exercises_equipment_idx on public.exercises (equipment);
create index if not exists exercises_target_idx on public.exercises (target);
create index if not exists exercises_source_idx on public.exercises (source);

-- Nota: no se pone unique sobre (source, name). El dataset tiene 6 nombres
-- repetidos que son variantes reales con distinto id y media; la PK sobre id
-- ya garantiza la unicidad.
