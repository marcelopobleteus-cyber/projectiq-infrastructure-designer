-- 033_fiber_pair_allocation.sql
-- Aplicada en produccion (fkokqccxhljbuqyutkxi) el 2026-09-01.
--
-- Regla real de ocupacion de hilos, corregida con lo que paso en terreno:
--
--   DROP (cable dedicado a la caja): SIEMPRE hilos 1 y 2. Cada camara tiene
--   su propio drop, asi que la numeracion se reinicia en cada cable.
--
--   BACKBONE (144F compartido): par correlativo por camara.
--     camara 1 -> 1,2   camara 2 -> 3,4   camara 3 -> 5,6 ...
--     144 hilos = 72 camaras de capacidad.
--
-- Los hilos 3 y 4 del drop son RESERVA, no encadenado. El cliente pidio 4
-- pigtails pero en terreno solo se fusionaron 2: por eso el material y la
-- mano de obra no coinciden y hay que poder expresar ambos.

alter table public.enclosure_kits
  rename column fiber_strands_used to pigtail_count;

alter table public.enclosure_kits
  add column if not exists strands_spliced integer not null default 2
    check (strands_spliced > 0);

comment on column public.enclosure_kits.pigtail_count is
  'Pigtails que se instalan en la caja (material). Puede ser mayor que strands_spliced.';
comment on column public.enclosure_kits.strands_spliced is
  'Hilos que realmente se fusionan (mano de obra). El resto queda de reserva.';

update public.enclosure_kits
   set pigtail_count = 4,
       strands_spliced = 2,
       description = 'Caja de campo en poste. La fibra llega y se fusionan los hilos 1 y 2 (Blue, Orange) contra pigtails en una bandeja; se dejan 4 pigtails, quedando 3 y 4 de reserva. Los pigtails van al SFP de un switch PoE de 4 puertos. Del switch sale Ethernet a un surge protector en linea, y de ahi a la camara montada en el poste con bracket.'
 where code = 'KIT-CAM-FIELD-4' and organization_id is null;

-- Trazabilidad del par que ocupa cada camara en el backbone compartido
alter table public.camera_locations
  add column if not exists backbone_cable_id uuid references public.fiber_cables(id) on delete set null,
  add column if not exists backbone_strand_a integer,
  add column if not exists backbone_strand_b integer;

create index if not exists camera_locations_backbone_idx
  on public.camera_locations (backbone_cable_id, backbone_strand_a);

-- Un par del backbone no puede quedar asignado a dos camaras
create unique index if not exists camera_locations_backbone_pair_unique
  on public.camera_locations (backbone_cable_id, backbone_strand_a)
  where backbone_cable_id is not null;
