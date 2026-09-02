-- 036_per_item_asset_condition.sql
-- Aplicada en produccion (fkokqccxhljbuqyutkxi) el 2026-09-01.
--
-- CADA LINEA DE MATERIAL DICE SI EL FIERRO YA ESTABA.
--
-- Hasta ahora la condicion existente/nuevo vivia en el elemento fisico
-- (nodo, ruta, caja) pero NO en la linea de BOM. Eso alcanzaba mientras un
-- elemento fuera una sola cosa, pero una caja de campo son doce: la caja
-- puede ser existente y el switch nuevo, o al reves. En las actualizaciones
-- se ocupo la misma caja y solo se cambio el equipo de adentro.
--
-- Los tres ejes quedan completos en cada linea:
--   asset_condition        el fierro ya estaba?
--   work_scope             que trabajo hacemos?
--   supply_responsibility  quien lo compra?

alter table public.bom_items
  add column if not exists asset_condition asset_condition not null default 'new';

update public.bom_items
   set asset_condition = 'existing'
 where work_scope in ('reuse','modify','reference') and asset_condition = 'new';

create index if not exists bom_items_condition_idx
  on public.bom_items (project_id, asset_condition, work_scope);

alter table public.enclosure_kit_items
  add column if not exists default_asset_condition asset_condition not null default 'new';

-- Tarifas para intervenir equipo existente. Actualizacion sin instalacion
-- nueva: la caja ya esta y se le trabaja adentro. Sin estas tarifas ese
-- trabajo quedaba en cero.
-- ATENCION: valores de partida EDITABLES, no cotizaciones verificadas.
insert into public.labor_rates
 (organization_id, code, description, module, applies_to_scope, structure_type, unit, rate, notes)
values
  (null,'LAB-ENC-REUSE','Open existing enclosure, verify & prep for new equipment','enclosure','reuse',null,'ea',220.00,'Tarifa base editable - ajustar con costo real'),
  (null,'LAB-ENC-MOD','Retrofit existing enclosure: mount, wire & terminate new equipment','enclosure','modify',null,'ea',480.00,'Tarifa base editable - ajustar con costo real'),
  (null,'LAB-SW-SWAP','Swap switch in existing enclosure, re-terminate & test','network','replace',null,'ea',380.00,'Tarifa base editable - ajustar con costo real'),
  (null,'LAB-CAM-SWAP','Replace camera on existing bracket, aim & commission','cctv','replace','pole','ea',290.00,'Tarifa base editable - ajustar con costo real')
on conflict (organization_id, code) do nothing;
