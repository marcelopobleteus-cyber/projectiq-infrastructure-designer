-- Alcance del iluminador IR, para la simulacion nocturna.
--
-- El dato de vision nocturna solo existia en el arreglo escrito a mano de la
-- pagina del catalogo ("Laser IR 250m", "OptimizedIR", "No"), que es texto
-- comercial y no un numero con el que se pueda dibujar. Aqui se guarda por
-- camara, en pies, igual que el resto de las medidas del sistema.
--
-- Es por camara y no por modelo a proposito: dos camaras del mismo modelo
-- pueden llevar iluminador externo distinto, y el que decide es quien esta en
-- terreno.

alter table public.camera_locations
  add column if not exists ir_range_ft numeric;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'camera_locations_ir_range_check') then
    alter table public.camera_locations
      add constraint camera_locations_ir_range_check
      check (ir_range_ft is null or (ir_range_ft > 0 and ir_range_ft <= 3000));
  end if;
end $$;

comment on column public.camera_locations.ir_range_ft is
  'Alcance del iluminador IR en pies, para la simulacion nocturna. Null = la camara no tiene IR o no se ha cargado.';
