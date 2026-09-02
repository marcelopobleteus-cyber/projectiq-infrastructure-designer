-- 030_bom_backup_and_labor_rates.sql
-- Aplicada en produccion (fkokqccxhljbuqyutkxi) el 2026-09-01.
--
-- Dos piezas que cierran el modelo existente/nuevo:
--   1. Respaldo reversible de las lineas de BOM retiradas por reclasificacion.
--   2. Tarifas de mano de obra por alcance: reutilizar no cuesta material,
--      pero si cuesta trabajo.

-- ============================================================
-- 1) Respaldo reversible
-- ============================================================
create table if not exists public.bom_items_removed (
  id uuid primary key default gen_random_uuid(),
  original_id uuid not null,
  project_id uuid not null references public.projects(id) on delete cascade,
  payload jsonb not null,
  removed_reason text not null,
  removed_at timestamptz not null default now(),
  restored_at timestamptz
);

create index if not exists bom_items_removed_project_idx on public.bom_items_removed(project_id);
alter table public.bom_items_removed enable row level security;

drop policy if exists select_bom_items_removed on public.bom_items_removed;
create policy select_bom_items_removed on public.bom_items_removed for select using (
  exists (select 1 from organization_members om
          join projects p on p.organization_id = om.organization_id
          where p.id = bom_items_removed.project_id and om.profile_id = auth.uid()));

drop policy if exists insert_bom_items_removed on public.bom_items_removed;
create policy insert_bom_items_removed on public.bom_items_removed for insert with check (
  exists (select 1 from organization_members om
          join projects p on p.organization_id = om.organization_id
          where p.id = bom_items_removed.project_id and om.profile_id = auth.uid()));

drop policy if exists update_bom_items_removed on public.bom_items_removed;
create policy update_bom_items_removed on public.bom_items_removed for update using (
  exists (select 1 from organization_members om
          join projects p on p.organization_id = om.organization_id
          where p.id = bom_items_removed.project_id and om.profile_id = auth.uid()));

-- ============================================================
-- 2) Tarifas de mano de obra por alcance
-- ============================================================
create table if not exists public.labor_rates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  code text not null,
  description text not null,
  module bom_module not null default 'general',
  applies_to_scope work_scope not null,
  structure_type text,
  unit text not null default 'ea',
  rate numeric(12,2) not null default 0,
  notes text,
  is_default boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz default now(),
  unique (organization_id, code)
);

create index if not exists labor_rates_lookup_idx
  on public.labor_rates (module, applies_to_scope, structure_type);

alter table public.labor_rates enable row level security;

-- Las tarifas por defecto (organization_id null) las lee cualquiera;
-- las propias de una organizacion solo sus miembros, que son los unicos
-- que pueden crearlas o editarlas.
drop policy if exists select_labor_rates on public.labor_rates;
create policy select_labor_rates on public.labor_rates for select using (
  organization_id is null or exists (
    select 1 from organization_members om
    where om.organization_id = labor_rates.organization_id and om.profile_id = auth.uid()));

drop policy if exists insert_labor_rates on public.labor_rates;
create policy insert_labor_rates on public.labor_rates for insert with check (
  organization_id is not null and exists (
    select 1 from organization_members om
    where om.organization_id = labor_rates.organization_id and om.profile_id = auth.uid()));

drop policy if exists update_labor_rates on public.labor_rates;
create policy update_labor_rates on public.labor_rates for update using (
  organization_id is not null and exists (
    select 1 from organization_members om
    where om.organization_id = labor_rates.organization_id and om.profile_id = auth.uid()));

drop policy if exists delete_labor_rates on public.labor_rates;
create policy delete_labor_rates on public.labor_rates for delete using (
  organization_id is not null and exists (
    select 1 from organization_members om
    where om.organization_id = labor_rates.organization_id and om.profile_id = auth.uid()));

-- ATENCION: tarifas base como punto de partida EDITABLE.
-- No son precios de mercado verificados. Hay que ajustarlas con costos
-- reales de NGT antes de usarlas en una cotizacion a cliente.
insert into public.labor_rates (organization_id, code, description, module, applies_to_scope, structure_type, unit, rate, notes)
values
  (null,'LAB-MH-REUSE','Manhole access, dewater, clean & rack for new fiber','conduit','reuse','manhole','ea',450.00,'Tarifa base editable - ajustar con costo real'),
  (null,'LAB-HH-REUSE','Handhole access, clean & rack for new fiber','conduit','reuse','handhole','ea',180.00,'Tarifa base editable - ajustar con costo real'),
  (null,'LAB-PB-REUSE','Pull box access & preparation','conduit','reuse','pull_box','ea',90.00,'Tarifa base editable - ajustar con costo real'),
  (null,'LAB-DUCT-PROOF','Rod, proof & mandrel existing duct','conduit','reuse',null,'ft',1.25,'Tarifa base editable - ajustar con costo real'),
  (null,'LAB-POLE-MOD','Pole mount: camera, enclosure & appurtenances','cctv','modify','pole','ea',650.00,'Tarifa base editable - ajustar con costo real')
on conflict (organization_id, code) do nothing;
