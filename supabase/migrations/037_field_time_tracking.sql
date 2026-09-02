-- 037_field_time_tracking.sql
-- Aplicada en produccion (fkokqccxhljbuqyutkxi) el 2026-09-02.
--
-- Fichaje de terreno para tecnicos: entrada/salida por proyecto, horas
-- trabajadas y que se hizo, mas documentos de proyecto (planos, fichas
-- tecnicas, permisos) que el tecnico puede consultar desde el celular
-- sin pasar por el escritorio.

-- ============================================================
-- 1) Fichaje (time_entries)
-- ============================================================
create table if not exists public.time_entries (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  clock_in timestamptz not null default now(),
  clock_out timestamptz,
  work_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz default now(),
  constraint time_entries_clock_out_after_in check (clock_out is null or clock_out > clock_in)
);

create index if not exists time_entries_project_idx on public.time_entries(project_id, clock_in desc);
create index if not exists time_entries_profile_idx on public.time_entries(profile_id, clock_in desc);
create index if not exists time_entries_org_idx on public.time_entries(organization_id, clock_in desc);

-- Un tecnico no puede tener dos fichajes abiertos a la vez.
create unique index if not exists time_entries_one_open_per_profile
  on public.time_entries(profile_id) where (clock_out is null);

alter table public.time_entries enable row level security;

drop policy if exists select_time_entries on public.time_entries;
create policy select_time_entries on public.time_entries for select to authenticated
using (exists (
  select 1 from public.organization_members om
  where om.organization_id = time_entries.organization_id and om.profile_id = auth.uid()
));

drop policy if exists insert_time_entries on public.time_entries;
create policy insert_time_entries on public.time_entries for insert to authenticated
with check (
  profile_id = auth.uid()
  and exists (
    select 1 from public.organization_members om
    where om.organization_id = time_entries.organization_id and om.profile_id = auth.uid()
  )
  and exists (
    select 1 from public.projects p
    where p.id = time_entries.project_id and p.organization_id = time_entries.organization_id
  )
);

drop policy if exists update_time_entries on public.time_entries;
create policy update_time_entries on public.time_entries for update to authenticated
using (
  profile_id = auth.uid()
  or public.is_org_editor_or_above(organization_id, auth.uid())
)
with check (
  profile_id = auth.uid()
  or public.is_org_editor_or_above(organization_id, auth.uid())
);

drop policy if exists delete_time_entries on public.time_entries;
create policy delete_time_entries on public.time_entries for delete to authenticated
using (public.is_org_editor_or_above(organization_id, auth.uid()));

drop trigger if exists update_time_entries_updated_at on public.time_entries;
create trigger update_time_entries_updated_at before update on public.time_entries
  for each row execute function update_updated_at_column();

-- ============================================================
-- 2) Documentos de proyecto: bucket privado + RLS por membresia.
--    Ruta de objeto: {project_id}/{filename} - el primer segmento
--    de la ruta es el project_id y define quien puede leer/escribir.
-- ============================================================
insert into storage.buckets (id, name, public)
values ('project-documents', 'project-documents', false)
on conflict (id) do nothing;

drop policy if exists select_project_documents on storage.objects;
create policy select_project_documents on storage.objects for select to authenticated
using (
  bucket_id = 'project-documents'
  and exists (
    select 1 from public.projects p
    join public.organization_members om on om.organization_id = p.organization_id
    where p.id::text = (storage.foldername(name))[1] and om.profile_id = auth.uid()
  )
);

drop policy if exists insert_project_documents on storage.objects;
create policy insert_project_documents on storage.objects for insert to authenticated
with check (
  bucket_id = 'project-documents'
  and exists (
    select 1 from public.projects p
    where p.id::text = (storage.foldername(name))[1] and public.is_org_editor_or_above(p.organization_id, auth.uid())
  )
);

drop policy if exists delete_project_documents on storage.objects;
create policy delete_project_documents on storage.objects for delete to authenticated
using (
  bucket_id = 'project-documents'
  and exists (
    select 1 from public.projects p
    where p.id::text = (storage.foldername(name))[1] and public.is_org_editor_or_above(p.organization_id, auth.uid())
  )
);
