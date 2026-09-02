-- 028_bom_module_and_conduit.sql
-- Ya aplicada en produccion (fkokqccxhljbuqyutkxi) el 2026-09-01 via
-- migraciones: bom_module_categorization + conduit_module_tables.
-- Se versiona aqui para que el repo refleje el estado real de la base.

-- ============================================================
-- 1) Categorizacion modular del BOM
-- ============================================================
do $$ begin
  create type bom_module as enum (
    'cctv','conduit','fiber','enclosure','network','power','lighting','wireless','traffic','tower','general'
  );
exception when duplicate_object then null; end $$;

alter table public.bom_items
  add column if not exists module bom_module not null default 'general',
  add column if not exists subcategory text;

create index if not exists bom_items_project_module_idx
  on public.bom_items (project_id, module);

update public.bom_items set module = 'conduit', subcategory = 'structure'
  where part_number in ('HH-BOX','MH-COVER','PB-BOX');

update public.bom_items set module = 'conduit', subcategory = 'duct'
  where part_number in ('HDPE-COND','INNER-1.25','MULE-WP1250');

update public.bom_items set module = 'enclosure', subcategory = 'cabinet'
  where part_number in ('CAB-OUTDOOR');

update public.bom_items set module = 'fiber', subcategory = 'splice'
  where part_number in ('SE-CLOSURE');

update public.bom_items set module = 'fiber', subcategory = 'cable'
  where part_number is not null
    and part_number not in ('HH-BOX','MH-COVER','PB-BOX','HDPE-COND','INNER-1.25','MULE-WP1250','CAB-OUTDOOR','SE-CLOSURE')
    and category = 'Fiber';

-- ============================================================
-- 2) Modulo CONDUIT: obra civil como capa propia.
--    No duplica geometria: referencia fiber_routes / fiber_nodes.
-- ============================================================
create table if not exists public.conduit_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  route_id uuid references public.fiber_routes(id) on delete set null,
  run_tag text not null,
  install_method text not null default 'bore'
    check (install_method in ('bore','trench','aerial','existing','directional_drill','saw_cut')),
  surface_type text not null default 'unknown'
    check (surface_type in ('asphalt','concrete','sidewalk','grass','gravel','dirt','unknown')),
  material text not null default 'HDPE'
    check (material in ('HDPE','PVC','RMC','EMT','Innerduct','Other')),
  diameter_inches numeric(5,2) not null default 2.00,
  ways integer not null default 1 check (ways > 0),
  depth_inches numeric(6,2),
  length_feet numeric(12,2) not null default 0,
  status text not null default 'Planned',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz default now()
);

create table if not exists public.conduit_structures (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  node_id uuid references public.fiber_nodes(id) on delete set null,
  structure_tag text not null,
  structure_type text not null default 'handhole'
    check (structure_type in ('handhole','manhole','pull_box','vault','pedestal','other')),
  latitude double precision,
  longitude double precision,
  size_description text,
  depth_ft numeric(6,2),
  material text,
  cover_rating text,
  status text not null default 'Planned',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz default now()
);

create index if not exists conduit_runs_project_idx on public.conduit_runs(project_id);
create index if not exists conduit_runs_route_idx on public.conduit_runs(route_id);
create index if not exists conduit_structures_project_idx on public.conduit_structures(project_id);
create index if not exists conduit_structures_node_idx on public.conduit_structures(node_id);

alter table public.bom_items
  add column if not exists conduit_run_id uuid references public.conduit_runs(id) on delete set null,
  add column if not exists conduit_structure_id uuid references public.conduit_structures(id) on delete set null;

alter table public.conduit_runs enable row level security;
alter table public.conduit_structures enable row level security;

do $$
declare t text;
begin
  foreach t in array array['conduit_runs','conduit_structures'] loop
    execute format($f$
      drop policy if exists select_%1$s on public.%1$I;
      create policy select_%1$s on public.%1$I for select using (
        exists (select 1 from organization_members om
                where om.organization_id = %1$I.organization_id and om.profile_id = auth.uid()));
      drop policy if exists insert_%1$s on public.%1$I;
      create policy insert_%1$s on public.%1$I for insert with check (
        exists (select 1 from organization_members om
                where om.organization_id = %1$I.organization_id and om.profile_id = auth.uid()));
      drop policy if exists update_%1$s on public.%1$I;
      create policy update_%1$s on public.%1$I for update using (
        exists (select 1 from organization_members om
                where om.organization_id = %1$I.organization_id and om.profile_id = auth.uid()))
      with check (
        exists (select 1 from organization_members om
                where om.organization_id = %1$I.organization_id and om.profile_id = auth.uid()));
      drop policy if exists delete_%1$s on public.%1$I;
      create policy delete_%1$s on public.%1$I for delete using (
        exists (select 1 from organization_members om
                where om.organization_id = %1$I.organization_id and om.profile_id = auth.uid()));
    $f$, t);
  end loop;
end $$;

-- ============================================================
-- 3) Backfill desde los proyectos reales
-- ============================================================
insert into public.conduit_runs (organization_id, project_id, route_id, run_tag, install_method, material, diameter_inches, length_feet, notes)
select r.organization_id, r.project_id, r.id,
       coalesce(r.route_id_tag,'RUN-'||left(r.id::text,8)),
       case when r.installation_type='underground' then 'bore' else 'trench' end,
       'HDPE', coalesce(r.conduit_diameter_inches,2.00),
       coalesce(r.installed_length_feet, r.measured_length_feet, 0),
       'Backfill desde fiber_routes'
from public.fiber_routes r
where not exists (select 1 from public.conduit_runs c where c.route_id = r.id);

insert into public.conduit_structures (organization_id, project_id, node_id, structure_tag, structure_type, latitude, longitude, size_description, depth_ft, notes)
select n.organization_id, n.project_id, n.id,
       coalesce(n.node_tag,'STR-'||left(n.id::text,8)),
       case n.node_type when 'Handhole' then 'handhole' when 'Manhole' then 'manhole' when 'Pull Box' then 'pull_box' end,
       n.latitude, n.longitude, n.size_description, n.structure_depth_ft,
       'Backfill desde fiber_nodes'
from public.fiber_nodes n
where n.node_type in ('Handhole','Manhole','Pull Box')
  and not exists (select 1 from public.conduit_structures s where s.node_id = n.id);

update public.bom_items b set conduit_structure_id = s.id
from public.conduit_structures s
where b.fiber_node_id = s.node_id and b.module='conduit' and b.subcategory='structure' and b.conduit_structure_id is null;

update public.bom_items b set conduit_run_id = c.id
from public.conduit_runs c
where b.fiber_route_id = c.route_id and b.module='conduit' and b.subcategory='duct' and b.conduit_run_id is null;

-- disciplines[] coherente con los datos reales
update public.projects p
set disciplines = array_append(p.disciplines,'conduit')
where not ('conduit' = any(p.disciplines))
  and (exists(select 1 from conduit_runs c where c.project_id=p.id)
    or exists(select 1 from conduit_structures s where s.project_id=p.id));
