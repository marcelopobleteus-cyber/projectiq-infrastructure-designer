-- 032_enclosure_kit_real_composition.sql
-- Aplicada en produccion (fkokqccxhljbuqyutkxi) el 2026-09-01.
--
-- Correccion del kit segun la composicion real en terreno:
--   la fibra de 12 llega a la caja
--   se ocupan los primeros 2 o 4 hilos, en orden de color
--   (TIA-598-C: 1 Blue, 2 Orange, 3 Green, 4 Brown)
--   se empalman por fusion contra 4 pigtails, guardados en una bandeja
--   los pigtails van al SFP de un switch PoE de 4 puertos (nuevo o existente)
--   del switch sale Ethernet a un surge protector EN LINEA
--   del surge protector sale Ethernet a la camara, en el mismo poste
--
-- La version anterior tenia switch de 8 puertos, un cierre de 12 hilos en vez
-- de la bandeja, y el surge protector como accesorio suelto en vez de un
-- elemento de la cadena.

-- Vaciar la lista vieja ANTES de endurecer el constraint: la fila
-- SE-CLOSURE-12 usaba el rol 'splice', que ya no existe.
delete from public.enclosure_kit_items i
 using public.enclosure_kits k
 where i.kit_id = k.id and k.code='KIT-CAM-FIELD-4' and k.organization_id is null;

alter table public.enclosure_kit_items
  drop constraint if exists enclosure_kit_items_role_check;

alter table public.enclosure_kit_items
  add constraint enclosure_kit_items_role_check check (role in (
    'enclosure','switch','power_supply','indicator','splice_tray','pigtail',
    'surge','bracket','ground','cable','sfp','accessory'));

alter table public.enclosure_kits
  -- Puertos RJ45 PoE de cara al usuario. El uplink de fibra va aparte.
  add column if not exists sfp_uplink_count integer not null default 1,
  -- Cuantos hilos del cable se ocupan en esta caja: 2 o 4 en la practica.
  add column if not exists fiber_strands_used integer not null default 4
    check (fiber_strands_used > 0);

update public.enclosure_kits
   set switch_port_count = 4,
       camera_capacity = 4,
       poe_budget_watts = 60,
       sfp_uplink_count = 1,
       fiber_strands_used = 4,
       name = 'Camera Field Enclosure (4-port)',
       description = 'Caja de campo en poste. La fibra de 12 llega y se ocupan los primeros 4 hilos por norma de color; se empalman contra pigtails en una bandeja dentro de la caja. Los pigtails van al SFP de un switch PoE de 4 puertos. Del switch sale Ethernet a un surge protector en linea, y de ahi a la camara montada en el poste con bracket.'
 where code = 'KIT-CAM-FIELD-4' and organization_id is null;

-- ATENCION: precios de partida EDITABLES, no cotizaciones verificadas.
insert into public.enclosure_kit_items (kit_id, part_number, description, role, quantity, unit, unit_cost, sort_order)
select k.id, v.pn, v.descr, v.role, v.qty, v.unit, v.cost, v.ord
from public.enclosure_kits k,
(values
 ('ENC-NEMA4X-16','NEMA 4X Enclosure 16x14x8 with backplate','enclosure',1,'pcs',480.00,1),
 ('SPL-CASSETTE-12','Fiber Splice Cassette / tray, 12-splice, in-enclosure','splice_tray',1,'pcs',95.00,2),
 ('PIGTAIL-SM-LC','SM LC Pigtail 900um, 3ft (Blue/Orange/Green/Brown)','pigtail',4,'pcs',12.00,3),
 ('SW-POE-4P','4-Port PoE+ Hardened Switch with SFP uplink','switch',1,'pcs',720.00,4),
 ('SFP-1G-SM','1G SFP Single-mode transceiver','sfp',1,'pcs',95.00,5),
 ('PSU-DIN-60W','DIN-rail Power Supply 60W 54VDC','power_supply',1,'pcs',145.00,6),
 ('LT-BLUE-LED','Blue Indicator Light, LED, pole mount','indicator',1,'pcs',240.00,7),
 ('SPD-POE','PoE Surge Protector, in-line, enclosed','surge',1,'pcs',75.00,8),
 ('BRK-POLE-ENC','Pole Mounting Bracket & Band Kit for enclosure','bracket',1,'pcs',145.00,9),
 ('BRK-POLE-CAM','Camera Pole Bracket & Arm','bracket',1,'pcs',110.00,10),
 ('GND-KIT','Grounding Kit, rod, lug & bond wire','ground',1,'pcs',95.00,11),
 ('UTP-CAT6-OD','Cat6 Outdoor Shielded UTP: switch to SPD to camera','cable',60,'ft',0.85,12)
) as v(pn,descr,role,qty,unit,cost,ord)
where k.code='KIT-CAM-FIELD-4' and k.organization_id is null;
