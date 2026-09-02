-- 038_market_rates_and_ofci_cameras.sql
-- Aplicada en produccion (fkokqccxhljbuqyutkxi) el 2026-09-02.
--
-- Reemplaza los valores que se inventaron sin base por rangos de mercado
-- 2026 del sureste de EE.UU., para que la demo muestre cifras defendibles
-- y el cliente vea que al poner SUS numeros el calculo cambia de verdad.
--
-- SIGUEN SIENDO REFERENCIA, no la tarifa de NGT. Se ajustan en
-- Settings > Labor Rates sin tocar la base.
--
-- Fuentes de los rangos:
--   HDD para fibra 15-50 USD/ft, mediana de despliegue ~18.25 USD/ft
--   Empalme por fusion en camara subterranea 80-130 USD
--   Mano de obra CCTV sureste 75-125 USD + 50-200 USD por exterior/altura
--
-- Ademas: las camaras del Beltline las provee el cliente. Son tres items
-- (camara, bracket y brazo) y se marcan OFCI: aparecen en el BOM para el
-- as-built, pero fuera de lo facturable.

update public.labor_rates set rate = v.r, notes = v.n
from (values
  ('LAB-MH-REUSE',   385.00, 'Ref. mercado 2026 sureste EE.UU. Ajustar con costo real de NGT'),
  ('LAB-HH-REUSE',   165.00, 'Ref. mercado 2026 sureste EE.UU. Ajustar con costo real de NGT'),
  ('LAB-PB-REUSE',    85.00, 'Ref. mercado 2026 sureste EE.UU. Ajustar con costo real de NGT'),
  ('LAB-DUCT-PROOF',   1.85, 'Ref. mercado 2026 sureste EE.UU. Ajustar con costo real de NGT'),
  ('LAB-POLE-MOD',   420.00, 'Ref. mercado 2026 sureste EE.UU. Ajustar con costo real de NGT'),
  ('LAB-CAM-SWAP',   185.00, 'Ref. mercado 2026 sureste EE.UU. Ajustar con costo real de NGT'),
  ('LAB-ENC-REUSE',  195.00, 'Ref. mercado 2026 sureste EE.UU. Ajustar con costo real de NGT'),
  ('LAB-ENC-MOD',    425.00, 'Ref. mercado 2026 sureste EE.UU. Ajustar con costo real de NGT'),
  ('LAB-SW-SWAP',    340.00, 'Ref. mercado 2026 sureste EE.UU. Ajustar con costo real de NGT')
) as v(c, r, n)
where labor_rates.code = v.c and labor_rates.organization_id is null;

update public.enclosure_kit_items set unit_cost = v.c
from (values
  ('ENC-NEMA4X-16',  520.00), ('SPL-CASSETTE-12', 110.00),
  ('PIGTAIL-SM-LC',   14.00), ('SW-POE-4P',       845.00),
  ('SFP-1G-SM',      110.00), ('PSU-DIN-60W',     165.00),
  ('LT-BLUE-LED',    285.00), ('SPD-POE',          92.00),
  ('BRK-POLE-ENC',   165.00), ('BRK-POLE-CAM',    135.00),
  ('GND-KIT',        110.00), ('UTP-CAT6-OD',       0.92),
  ('CAB-OUTDOOR-48',2650.00), ('SW-24P-L2',      2100.00),
  ('FPP-48',         465.00), ('SE-CLOSURE',      285.00),
  ('PSU-RACK-UPS',  1150.00)
) as v(pn, c)
where enclosure_kit_items.part_number = v.pn;

update public.bom_items set unit_cost = v.c
from (values
  ('HDPE-COND',    1.35), ('INNER-1.25',   0.82), ('MULE-WP1250',  0.18),
  ('HH-BOX',     780.00), ('PB-BOX',     165.00), ('SE-CLOSURE', 285.00),
  ('CAB-OUTDOOR',1450.00)
) as v(pn, c)
where bom_items.part_number = v.pn;

-- Camaras provistas por el cliente
update public.camera_locations
   set supply_responsibility = 'owner',
       supplied_by = 'NGT Group LLC',
       material_received = false;

update public.camera_models set estimated_cost = 795.00
 where model_number = 'P3245-LVE';

-- Bracket y brazo como lineas propias, tambien OFCI
insert into public.bom_items
 (project_id, category, module, subcategory, asset_condition, work_scope,
  supply_responsibility, supplied_by, material_received,
  part_number, description, quantity, unit, unit_cost, source, manufacturer, status)
select p.id, 'Mounting', 'cctv', 'bracket', 'new', 'install',
       'owner', 'NGT Group LLC', false,
       v.pn, v.d, (select count(*) from camera_locations c where c.project_id=p.id),
       'pcs', v.c, 'catalog', 'Generic', 'Planned'
from projects p,
(values ('BRK-POLE-CAM','Camera Pole Mounting Bracket',135.00),
        ('ARM-POLE-CAM','Camera Pole Extension Arm',   98.00)) as v(pn,d,c)
where exists (select 1 from camera_locations c where c.project_id=p.id)
  and not exists (select 1 from bom_items b where b.project_id=p.id and b.part_number=v.pn);

-- Las lineas de mano de obra ya cargadas se sincronizan con la tarifa vigente
update public.bom_items b set unit_cost = lr.rate, updated_at = now()
from public.labor_rates lr
where lr.organization_id is null and lr.code = b.part_number
  and b.subcategory = 'labor' and b.unit_cost <> lr.rate;
