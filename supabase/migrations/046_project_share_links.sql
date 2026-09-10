-- Enlaces compartibles de solo lectura para clientes.
--
-- Hoy, para mostrarle el proyecto a un cliente hay que crearle una cuenta o
-- mandarle un PDF. Esto da una URL con contrasena y fecha de caducidad.
--
-- Decisiones de seguridad, para que no se pierdan:
--
-- 1. NO hay policy publica sobre esta tabla ni sobre los datos del proyecto.
--    La pagina publica valida el token y la contrasena en el servidor y recien
--    entonces lee con service role. Si en su lugar se abriera una policy
--    anonima, cualquiera con el nombre de la tabla podria leer proyectos.
-- 2. La contrasena se guarda como PBKDF2-SHA512 con salt por enlace. No se
--    puede recuperar, solo reemplazar el enlace.
-- 3. expires_at es NOT NULL: un enlace de cliente sin fecha de caducidad
--    termina vivo para siempre en el correo de alguien.

create table if not exists public.project_share_links (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  token text not null unique,
  password_salt text not null,
  password_hash text not null,
  label text,
  expires_at timestamptz not null,
  revoked boolean not null default false,
  view_count integer not null default 0,
  last_viewed_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists project_share_links_project_idx
  on public.project_share_links (project_id);

alter table public.project_share_links enable row level security;

drop policy if exists select_project_share_links on public.project_share_links;
create policy select_project_share_links on public.project_share_links for select using (
  exists (select 1 from organization_members om
    where om.organization_id = project_share_links.organization_id and om.profile_id = auth.uid()));

drop policy if exists insert_project_share_links on public.project_share_links;
create policy insert_project_share_links on public.project_share_links for insert with check (
  exists (select 1 from organization_members om
    where om.organization_id = project_share_links.organization_id and om.profile_id = auth.uid()));

drop policy if exists update_project_share_links on public.project_share_links;
create policy update_project_share_links on public.project_share_links for update using (
  exists (select 1 from organization_members om
    where om.organization_id = project_share_links.organization_id and om.profile_id = auth.uid()));

drop policy if exists delete_project_share_links on public.project_share_links;
create policy delete_project_share_links on public.project_share_links for delete using (
  exists (select 1 from organization_members om
    where om.organization_id = project_share_links.organization_id and om.profile_id = auth.uid()));

comment on table public.project_share_links is
  'Enlaces de solo lectura para clientes. Sin policy publica a proposito: la pagina publica valida el token y lee con service role.';
comment on column public.project_share_links.password_hash is
  'PBKDF2-SHA512 en hex. Nunca se guarda la contrasena en claro ni se puede recuperar.';
