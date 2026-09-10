-- Marca de la organizacion (white-label) para los PDF.
--
-- El Design Package se le entrega a un cliente; hoy sale con el nombre de la
-- organizacion y el verde por defecto de la app. Esto permite que salga con el
-- logo, el color y los datos de contacto de la empresa.
--
-- Sin fila, todo sigue igual que hoy: nombre de la organizacion y color por
-- defecto. La pestana Branding de Settings estaba declarada con built:false
-- desde hace tiempo; esto es lo que le da contenido.

create table if not exists public.organization_branding (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  logo_data_url text,
  primary_color text not null default '#009973',
  contact_name text,
  contact_email text,
  contact_phone text,
  website text,
  address text,
  license_number text,
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'organization_branding_color_check') then
    alter table public.organization_branding add constraint organization_branding_color_check
      check (primary_color ~ '^#[0-9A-Fa-f]{6}$');
  end if;
  -- ~700 KB de data URL = ~500 KB de imagen. Un logo mas pesado que eso no
  -- mejora el PDF y si hace lenta cada carga de Settings.
  if not exists (select 1 from pg_constraint where conname = 'organization_branding_logo_size_check') then
    alter table public.organization_branding add constraint organization_branding_logo_size_check
      check (logo_data_url is null or length(logo_data_url) <= 700000);
  end if;
end $$;

alter table public.organization_branding enable row level security;

drop policy if exists select_organization_branding on public.organization_branding;
create policy select_organization_branding on public.organization_branding for select using (
  exists (select 1 from organization_members om
    where om.organization_id = organization_branding.organization_id and om.profile_id = auth.uid()));

drop policy if exists insert_organization_branding on public.organization_branding;
create policy insert_organization_branding on public.organization_branding for insert with check (
  exists (select 1 from organization_members om
    where om.organization_id = organization_branding.organization_id and om.profile_id = auth.uid()));

drop policy if exists update_organization_branding on public.organization_branding;
create policy update_organization_branding on public.organization_branding for update using (
  exists (select 1 from organization_members om
    where om.organization_id = organization_branding.organization_id and om.profile_id = auth.uid()));

drop policy if exists delete_organization_branding on public.organization_branding;
create policy delete_organization_branding on public.organization_branding for delete using (
  exists (select 1 from organization_members om
    where om.organization_id = organization_branding.organization_id and om.profile_id = auth.uid()));

comment on table public.organization_branding is
  'Marca de la organizacion aplicada a los PDF. Sin fila = se usa el nombre de la organizacion y el color por defecto.';
comment on column public.organization_branding.logo_data_url is
  'Logo como data URL (PNG o JPEG). Se guarda en la fila y no en Storage porque el PDF se arma en el navegador y necesita los bytes sin una peticion extra.';
