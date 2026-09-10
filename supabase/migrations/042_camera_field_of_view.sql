-- Cono de vision de la camara.
--
-- La migracion 040 guardo el ANGULO de apertura (fov_degrees) y el lente.
-- Faltaba lo otro que hace falta para dibujar el cono: hacia donde apunta la
-- camara y hasta donde llega. Sin heading no hay direccion, y sin alcance el
-- cono no tiene largo.
--
-- Convencion de heading: 0 = norte, 90 = este, sentido horario, igual que un
-- compas y que MapLibre. Se eligio asi para no tener que convertir nada al
-- dibujar sobre el mapa.

alter table public.camera_locations
  add column if not exists heading_degrees numeric,
  add column if not exists fov_range_ft numeric,
  add column if not exists show_fov boolean not null default true;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'camera_locations_heading_check') then
    alter table public.camera_locations
      add constraint camera_locations_heading_check
      check (heading_degrees is null or (heading_degrees >= 0 and heading_degrees < 360));
  end if;

  -- 3000 ft es holgado incluso para una PTZ con lente largo; sirve para que
  -- un dato mal tipeado no dibuje un cono que cruza la ciudad.
  if not exists (select 1 from pg_constraint where conname = 'camera_locations_fov_range_check') then
    alter table public.camera_locations
      add constraint camera_locations_fov_range_check
      check (fov_range_ft is null or (fov_range_ft > 0 and fov_range_ft <= 3000));
  end if;
end $$;

comment on column public.camera_locations.heading_degrees is
  'Hacia donde apunta la camara. 0 = norte, 90 = este, sentido horario. Null = sin definir.';
comment on column public.camera_locations.fov_range_ft is
  'Alcance util del cono en pies. Null = se usa el valor por defecto del cliente.';
comment on column public.camera_locations.show_fov is
  'Permite ocultar el cono de una camara puntual sin borrar sus datos.';
