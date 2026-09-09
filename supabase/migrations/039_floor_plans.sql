-- 039_floor_plans.sql
-- Sube planos propios (PDF/imagen) por proyecto+módulo+piso, y permite
-- colocar cámaras sobre ese plano en vez del mapa. Ver
-- claude/plan-planos-subidos-por-modulo.md en el proyecto de Claude.

-- Storage bucket para los archivos de plano (PDF/imagen). Privado — se
-- accede vía URL firmada, igual que el resto de los datos del proyecto.
insert into storage.buckets (id, name, public)
values ('floor-plans', 'floor-plans', false)
on conflict (id) do nothing;

create table if not exists public.project_floor_plans (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  module text not null check (module in ('cameras', 'fiber')),
  floor_label text not null default 'Floor 1',
  sort_order int not null default 0,
  file_path text not null,           -- path dentro del bucket 'floor-plans'
  file_type text not null check (file_type in ('pdf', 'image')),
  page_number int not null default 1,
  image_width_px int,
  image_height_px int,
  scale_calibration jsonb,           -- {point_a:{x,y}, point_b:{x,y}, real_distance_m}
  uploaded_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_floor_plans_project_module
  on public.project_floor_plans(project_id, module);

alter table public.project_floor_plans enable row level security;

-- Mismo criterio de acceso que el resto de tablas de proyecto: miembros de
-- la organización dueña del proyecto.
create policy "floor_plans_select" on public.project_floor_plans
  for select using (
    project_id in (
      select p.id from public.projects p
      join public.organization_members om on om.organization_id = p.organization_id
      where om.profile_id = auth.uid()
    )
  );

create policy "floor_plans_insert" on public.project_floor_plans
  for insert with check (
    project_id in (
      select p.id from public.projects p
      join public.organization_members om on om.organization_id = p.organization_id
      where om.profile_id = auth.uid()
    )
  );

create policy "floor_plans_update" on public.project_floor_plans
  for update using (
    project_id in (
      select p.id from public.projects p
      join public.organization_members om on om.organization_id = p.organization_id
      where om.profile_id = auth.uid()
    )
  );

create policy "floor_plans_delete" on public.project_floor_plans
  for delete using (
    project_id in (
      select p.id from public.projects p
      join public.organization_members om on om.organization_id = p.organization_id
      where om.profile_id = auth.uid()
    )
  );

-- Storage policies: mismos miembros de organización pueden leer/escribir
-- archivos bajo floor-plans/<project_id>/...
create policy "floor_plans_storage_select" on storage.objects
  for select using (
    bucket_id = 'floor-plans'
    and (storage.foldername(name))[1] in (
      select p.id::text from public.projects p
      join public.organization_members om on om.organization_id = p.organization_id
      where om.profile_id = auth.uid()
    )
  );

create policy "floor_plans_storage_insert" on storage.objects
  for insert with check (
    bucket_id = 'floor-plans'
    and (storage.foldername(name))[1] in (
      select p.id::text from public.projects p
      join public.organization_members om on om.organization_id = p.organization_id
      where om.profile_id = auth.uid()
    )
  );

create policy "floor_plans_storage_delete" on storage.objects
  for delete using (
    bucket_id = 'floor-plans'
    and (storage.foldername(name))[1] in (
      select p.id::text from public.projects p
      join public.organization_members om on om.organization_id = p.organization_id
      where om.profile_id = auth.uid()
    )
  );

-- camera_locations: soporte de colocación sobre plano (nullable, no rompe
-- el modo mapa existente).
alter table public.camera_locations
  add column if not exists floor_plan_id uuid references public.project_floor_plans(id) on delete set null,
  add column if not exists plan_x numeric,
  add column if not exists plan_y numeric;

create index if not exists idx_camera_locations_floor_plan
  on public.camera_locations(floor_plan_id);

-- Selector de modo por proyecto+módulo (mapa vs plano subido).
alter table public.projects
  add column if not exists camera_canvas_mode text not null default 'map'
    check (camera_canvas_mode in ('map', 'uploaded_plan')),
  add column if not exists fiber_canvas_mode text not null default 'map'
    check (fiber_canvas_mode in ('map', 'uploaded_plan'));
