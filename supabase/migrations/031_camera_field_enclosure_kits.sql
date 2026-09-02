-- 031_camera_field_enclosure_kits.sql
-- Aplicada en produccion (fkokqccxhljbuqyutkxi) el 2026-09-01.
--
-- Kit de caja de campo de camara: el punto de demarcacion fibra/cobre.
--   fibra del main haul -> terminacion -> uplink SFP del switch
--   switch PoE -> UTP -> camara montada en el poste con bracket
--   fuente de poder alimenta el switch; luz azul de indicacion publica
--
-- La cadena camara->puerto->switch->caja->fibra YA existia en el esquema
-- (network_devices.cabinet_id, switch_ports.assigned_camera_location_id,
-- switch_ports.assigned_fiber_strand_id, fiber_enclosures.cabinet_id) pero
-- estaba sin usar: 0 switches ligados a una caja, 0 cierres dentro de una
-- caja, 3 de 51 camaras en un puerto. Armarla a mano eran 5 pasos por caja.

create table if not exists public.enclosure_kits (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  code text not null,
  name text not null,
  description text,
  camera_capacity integer not null default 4 check (camera_capacity > 0),
  switch_port_count integer not null default 8 check (switch_port_count > 0),
  poe_budget_watts integer not null default 120,
  is_default boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz default now(),
  unique (organization_id, code)
);

create table if not exists public.enclosure_kit_items (
  id uuid primary key default gen_random_uuid(),
  kit_id uuid not null references public.enclosure_kits(id) on delete cascade,
  part_number text not null,
  description text not null,
  -- role define que crea el sistema ademas de la linea de BOM:
  --   switch -> network_device + switch_ports
  --   splice -> fiber_enclosure dentro de la caja
  --   el resto solo aporta material
  role text not null default 'accessory'
    check (role in ('enclosure','switch','power_supply','indicator','splice','bracket','ground','cable','accessory')),
  quantity numeric(10,2) not null default 1,
  unit text not null default 'pcs',
  unit_cost numeric(12,2) not null default 0,
  manufacturer text default 'Generic',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists enclosure_kit_items_kit_idx on public.enclosure_kit_items(kit_id);

alter table public.cabinets
  add column if not exists kit_id uuid references public.enclosure_kits(id) on delete set null,
  add column if not exists mounted_on_node_id uuid references public.fiber_nodes(id) on delete set null,
  add column if not exists mount_type text default 'pole'
    check (mount_type in ('pole','pedestal','wall','strand','ground','other'));

alter table public.bom_items
  add column if not exists cabinet_id uuid references public.cabinets(id) on delete set null;

-- El largo del UTP importa: Ethernet sobre cobre muere a los 100 m (328 ft).
alter table public.camera_locations
  add column if not exists served_by_cabinet_id uuid references public.cabinets(id) on delete set null,
  add column if not exists drop_cable_ft numeric(8,2),
  add column if not exists mount_hardware text;

create index if not exists cabinets_kit_idx on public.cabinets(kit_id);
create index if not exists camera_locations_cabinet_idx on public.camera_locations(served_by_cabinet_id);

alter table public.enclosure_kits enable row level security;
alter table public.enclosure_kit_items enable row level security;

drop policy if exists select_enclosure_kits on public.enclosure_kits;
create policy select_enclosure_kits on public.enclosure_kits for select using (
  organization_id is null or exists (
    select 1 from organization_members om
    where om.organization_id = enclosure_kits.organization_id and om.profile_id = auth.uid()));

drop policy if exists insert_enclosure_kits on public.enclosure_kits;
create policy insert_enclosure_kits on public.enclosure_kits for insert with check (
  organization_id is not null and exists (
    select 1 from organization_members om
    where om.organization_id = enclosure_kits.organization_id and om.profile_id = auth.uid()));

drop policy if exists update_enclosure_kits on public.enclosure_kits;
create policy update_enclosure_kits on public.enclosure_kits for update using (
  organization_id is not null and exists (
    select 1 from organization_members om
    where om.organization_id = enclosure_kits.organization_id and om.profile_id = auth.uid()));

drop policy if exists delete_enclosure_kits on public.enclosure_kits;
create policy delete_enclosure_kits on public.enclosure_kits for delete using (
  organization_id is not null and exists (
    select 1 from organization_members om
    where om.organization_id = enclosure_kits.organization_id and om.profile_id = auth.uid()));

drop policy if exists select_enclosure_kit_items on public.enclosure_kit_items;
create policy select_enclosure_kit_items on public.enclosure_kit_items for select using (
  exists (select 1 from enclosure_kits k where k.id = enclosure_kit_items.kit_id
          and (k.organization_id is null or exists (
            select 1 from organization_members om
            where om.organization_id = k.organization_id and om.profile_id = auth.uid()))));

drop policy if exists write_enclosure_kit_items on public.enclosure_kit_items;
create policy write_enclosure_kit_items on public.enclosure_kit_items for all using (
  exists (select 1 from enclosure_kits k where k.id = enclosure_kit_items.kit_id
          and k.organization_id is not null and exists (
            select 1 from organization_members om
            where om.organization_id = k.organization_id and om.profile_id = auth.uid())));

-- ATENCION: precios de partida EDITABLES, no cotizaciones verificadas.
-- Hay que reemplazarlos con los costos reales de NGT antes de cotizar.
insert into public.enclosure_kits (organization_id, code, name, description, camera_capacity, switch_port_count, poe_budget_watts)
values (null,'KIT-CAM-FIELD-4','Camera Field Enclosure (4-camera)',
 'Caja de campo en poste: switch PoE, fuente de poder, luz azul de indicacion y terminacion de fibra. La camara se monta en el poste con bracket y baja por UTP a esta caja.',
 4, 8, 120)
on conflict (organization_id, code) do nothing;

insert into public.enclosure_kit_items (kit_id, part_number, description, role, quantity, unit, unit_cost, sort_order)
select k.id, v.pn, v.descr, v.role, v.qty, v.unit, v.cost, v.ord
from public.enclosure_kits k,
(values
 ('ENC-NEMA4X-24','NEMA 4X Enclosure 24x20x8 with backplate','enclosure',1,'pcs',780.00,1),
 ('SW-POE-8P','8-Port PoE+ Managed Switch, hardened, SFP uplink','switch',1,'pcs',950.00,2),
 ('PSU-DIN-120W','DIN-rail Power Supply 120W 54VDC','power_supply',1,'pcs',185.00,3),
 ('LT-BLUE-LED','Blue Indicator Light, LED, pole mount','indicator',1,'pcs',240.00,4),
 ('SE-CLOSURE-12','Fiber Splice Enclosure / termination, 12-strand','splice',1,'pcs',320.00,5),
 ('SFP-1G-SM','1G SFP Single-mode transceiver','accessory',1,'pcs',95.00,6),
 ('BRK-POLE-ENC','Pole Mounting Bracket & Band Kit for enclosure','bracket',1,'pcs',145.00,7),
 ('BRK-POLE-CAM','Camera Pole Bracket & Arm','bracket',1,'pcs',110.00,8),
 ('GND-KIT','Grounding Kit, rod, lug & bond wire','ground',1,'pcs',95.00,9),
 ('UTP-CAT6-OD','Cat6 Outdoor Shielded UTP, camera drop','cable',100,'ft',0.85,10),
 ('SPD-POE','PoE Surge Protector, in-line','accessory',1,'pcs',75.00,11)
) as v(pn,descr,role,qty,unit,cost,ord)
where k.code='KIT-CAM-FIELD-4' and k.organization_id is null
and not exists (select 1 from enclosure_kit_items i where i.kit_id=k.id and i.part_number=v.pn);
