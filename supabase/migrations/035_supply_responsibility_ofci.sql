-- 035_supply_responsibility_ofci.sql
-- Aplicada en produccion (fkokqccxhljbuqyutkxi) el 2026-09-01.
--
-- QUIEN PROVEE EL MATERIAL — tercer eje, independiente de los otros dos.
--
--   asset_condition        ¿el fierro ya estaba en terreno?
--   work_scope             ¿que trabajo hacemos sobre el?
--   supply_responsibility  ¿quien lo compra?           <- NUEVO
--
-- Una caja provista por el cliente es NUEVA (no existia en terreno) y la
-- instalamos nosotros, pero NO la compramos. Ninguno de los tres ejes se
-- deduce de los otros, por eso son tres y no uno.
--
-- Nomenclatura estandar de construccion:
--   CFCI  Contractor Furnished, Contractor Installed  (lo normal)
--   OFCI  Owner Furnished, Contractor Installed       (el cliente provee)
--   OFOI  Owner Furnished, Owner Installed            (solo documentamos)
--
-- La linea OFCI SI aparece en el BOM: el as-built tiene que estar completo
-- para poder entregar como quedo conectado. Lo que cambia es que su costo
-- no entra en lo facturable, aunque la mano de obra de instalarla si.

do $$ begin
  create type supply_responsibility as enum ('contractor','owner','other_contractor');
exception when duplicate_object then null; end $$;

comment on type supply_responsibility is
  'Quien compra el material. contractor = CFCI (nosotros). owner = OFCI, lo provee el cliente y solo lo instalamos. other_contractor = lo provee un tercero.';

do $$
declare t text;
begin
  foreach t in array array[
    'bom_items','cabinets','network_devices','camera_locations',
    'fiber_enclosures','conduit_runs','conduit_structures','fiber_cables'
  ] loop
    execute format(
      'alter table public.%1$I
         add column if not exists supply_responsibility supply_responsibility not null default ''contractor'',
         add column if not exists supplied_by text,
         add column if not exists material_received boolean not null default false,
         add column if not exists material_received_at timestamptz', t);
  end loop;
end $$;

comment on column public.bom_items.supplied_by is
  'Nombre de quien provee, cuando no somos nosotros. Va en el as-built.';
comment on column public.bom_items.material_received is
  'Material OFCI recibido en obra. Sin esto la cuadrilla llega y no puede instalar.';

create index if not exists bom_items_supply_idx
  on public.bom_items (project_id, supply_responsibility);

alter table public.enclosure_kit_items
  add column if not exists supply_responsibility supply_responsibility not null default 'contractor';

-- Lo que cobramos vs lo que provee el cliente, separado a proposito.
-- Meter material del cliente en nuestro total infla la cotizacion;
-- omitirlo del BOM rompe el as-built.
create or replace view public.project_cost_summary as
select
  b.project_id,
  sum(b.quantity * b.unit_cost) filter (
    where b.supply_responsibility = 'contractor' and coalesce(b.subcategory,'') <> 'labor'
  ) as material_contractor,
  sum(b.quantity * b.unit_cost) filter (
    where b.supply_responsibility <> 'contractor' and coalesce(b.subcategory,'') <> 'labor'
  ) as material_owner_furnished,
  sum(b.quantity * b.unit_cost) filter (
    where coalesce(b.subcategory,'') = 'labor'
  ) as labor,
  sum(b.quantity * b.unit_cost) filter (
    where b.supply_responsibility = 'contractor'
  ) as billable_total,
  count(*) filter (where b.supply_responsibility <> 'contractor') as ofci_lines,
  count(*) filter (
    where b.supply_responsibility <> 'contractor' and b.material_received = false
  ) as ofci_pending_delivery
from public.bom_items b
group by b.project_id;
