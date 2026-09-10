-- Especificaciones opticas y de red de la camara.
-- fov_degrees y lens habilitan ademas el cono de vision del roadmap.
alter table public.camera_locations
  add column if not exists lens text,
  add column if not exists mounting_height_ft numeric,
  add column if not exists ip_address text,
  add column if not exists resolution text,
  add column if not exists fov_degrees numeric;

-- Rangos con sentido fisico: evita que un dato mal tipeado rompa el futuro
-- calculo del cono de vision.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'camera_locations_fov_degrees_check') then
    alter table public.camera_locations
      add constraint camera_locations_fov_degrees_check
      check (fov_degrees is null or (fov_degrees > 0 and fov_degrees <= 360));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'camera_locations_mounting_height_check') then
    alter table public.camera_locations
      add constraint camera_locations_mounting_height_check
      check (mounting_height_ft is null or (mounting_height_ft >= 0 and mounting_height_ft <= 1000));
  end if;
end $$;

comment on column public.camera_locations.lens is 'Lente, texto libre: "2.8mm", "2.8-12mm varifocal"';
comment on column public.camera_locations.mounting_height_ft is 'Altura de montaje en pies, por consistencia con drop_cable_ft';
comment on column public.camera_locations.fov_degrees is 'Angulo de vision horizontal en grados';
