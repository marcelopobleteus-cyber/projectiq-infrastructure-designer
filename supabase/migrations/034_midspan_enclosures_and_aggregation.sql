-- 034_midspan_enclosures_and_aggregation.sql
-- Aplicada en produccion (fkokqccxhljbuqyutkxi) el 2026-09-01.
--
-- Dos correcciones de modelo que salieron al dibujar los diagramas:
--
-- 1. ENCLOSURE MIDSPAN. Donde hay un enclosure hay fusion: el backbone de
--    144 se ABRE en ese punto, se fusionan solo los hilos de esa camara y
--    se vuelve a cerrar; los demas siguen derecho (pass-through).
--    El manhole puede ser existente y reutilizado, pero el enclosure que
--    va adentro es un dispositivo NUEVO que se compra. Son dos cosas
--    distintas y el BOM debe tratarlas distinto.
--
-- 2. GABINETE DE AGREGACION. El gabinete donde llegan las fibras NO es el
--    core: es un punto de intercomunicacion con switches de 24 puertos y
--    un uplink que sale hacia el core, que vive en otro lugar y no es
--    alcance del proyecto.

alter table public.fiber_enclosures
  add column if not exists role text not null default 'midspan_splice'
    check (role in ('midspan_splice','termination','field_termination','headend')),
  add column if not exists part_number text,
  add column if not exists asset_condition asset_condition not null default 'new',
  add column if not exists work_scope work_scope not null default 'install';

comment on column public.fiber_enclosures.role is
  'midspan_splice: se abre el backbone, se fusiona el par de la camara y el resto pasa derecho. termination: extremo del cable.';

alter table public.bom_items
  add column if not exists fiber_enclosure_id uuid references public.fiber_enclosures(id) on delete set null;

update public.fiber_enclosures fe
   set role = 'midspan_splice'
  from public.fiber_nodes n
 where n.id = fe.node_id and n.node_type in ('Manhole','Handhole')
   and fe.cabinet_id is null;

update public.fiber_enclosures
   set role = 'field_termination'
 where cabinet_id is not null;

-- Los hilos que NO se tocan en un enclosure. Registrarlos es lo que le
-- dice al tecnico que no los corte al abrir la caja.
alter table public.fiber_cable_pass_throughs
  add column if not exists strand_from integer,
  add column if not exists strand_to integer,
  add column if not exists notes text;

alter table public.cabinets
  add column if not exists cabinet_role text not null default 'field'
    check (cabinet_role in ('field','aggregation','headend')),
  add column if not exists uplink_target text;

comment on column public.cabinets.cabinet_role is
  'field: caja en poste con una camara. aggregation: gabinete donde llegan las fibras, con switches de 24 puertos y uplink al core. El core mismo es externo al proyecto.';

update public.cabinets set cabinet_role = 'field'
 where cabinet_type = 'Camera Field Enclosure';

-- ATENCION: precios de partida EDITABLES, no cotizaciones verificadas.
insert into public.enclosure_kits
 (organization_id, code, name, description, camera_capacity, switch_port_count,
  sfp_uplink_count, poe_budget_watts, pigtail_count, strands_spliced)
values (null,'KIT-AGG-48','Aggregation Cabinet (48-port)',
 'Gabinete de intercomunicacion. Dos switches de 24 puertos reciben una camara por puerto a traves del backbone; un uplink sale hacia el core, que esta en otro lugar. La asignacion camara-puerto es configurable, no fija.',
 48, 48, 2, 0, 48, 48)
on conflict (organization_id, code) do nothing;

insert into public.enclosure_kit_items (kit_id, part_number, description, role, quantity, unit, unit_cost, sort_order)
select k.id, v.pn, v.descr, v.role, v.qty, v.unit, v.cost, v.ord
from public.enclosure_kits k,
(values
 ('CAB-OUTDOOR-48','Outdoor Aggregation Cabinet, ventilated, rack','enclosure',1,'pcs',2400.00,1),
 ('SW-24P-L2','24-Port Managed Switch L2, SFP uplinks','switch',2,'pcs',1850.00,2),
 ('FPP-48','Fiber Patch Panel / LIU, 48-port LC','splice_tray',1,'pcs',420.00,3),
 ('SE-CLOSURE','Splice Enclosure (24-Port)','splice_tray',1,'pcs',320.00,4),
 ('PIGTAIL-SM-LC','SM LC Pigtail 900um, 3ft','pigtail',48,'pcs',12.00,5),
 ('SFP-1G-SM','1G SFP Single-mode transceiver','sfp',48,'pcs',95.00,6),
 ('PSU-RACK-UPS','Rack UPS / power distribution','power_supply',1,'pcs',980.00,7),
 ('GND-KIT','Grounding Kit, rod, lug & bond wire','ground',1,'pcs',95.00,8)
) as v(pn,descr,role,qty,unit,cost,ord)
where k.code='KIT-AGG-48' and k.organization_id is null
and not exists (select 1 from enclosure_kit_items i where i.kit_id=k.id and i.part_number=v.pn);
