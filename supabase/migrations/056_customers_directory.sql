-- Directorio de clientes. Aplicado en vivo 2026-09-15.
--
-- Es tabla y no un texto libre en el proyecto porque el mismo cliente se repite
-- entre trabajos (en Construction Foreman, Mastec AL aparece en 4 de 7). Asi se
-- puede listar todo lo de un cliente, corregir sus datos en un solo lugar, y un
-- error de tipeo no crea un cliente fantasma.
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  contact_name text,
  contact_email text,
  contact_phone text,
  address text,
  notes text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  unique (organization_id, name)
);

alter table public.customers drop constraint if exists customers_status_check;
alter table public.customers
  add constraint customers_status_check check (status in ('active', 'inactive'));

alter table public.customers enable row level security;

drop policy if exists select_customers on public.customers;
create policy select_customers on public.customers
  for select to authenticated
  using (exists (select 1 from public.organization_members m
                  where m.organization_id = customers.organization_id
                    and m.profile_id = (select auth.uid())));

drop policy if exists write_customers on public.customers;
create policy write_customers on public.customers
  for all to authenticated
  using (exists (select 1 from public.organization_members m
                  where m.organization_id = customers.organization_id
                    and m.profile_id = (select auth.uid())
                    and m.role in ('owner','admin','editor')))
  with check (exists (select 1 from public.organization_members m
                       where m.organization_id = customers.organization_id
                         and m.profile_id = (select auth.uid())
                         and m.role in ('owner','admin','editor')));

-- SET NULL y no CASCADE: borrar un cliente del directorio no puede llevarse por
-- delante sus proyectos ni su historial.
alter table public.projects
  add column if not exists customer_id uuid references public.customers(id) on delete set null;

create index if not exists projects_customer_idx on public.projects (customer_id);
create index if not exists customers_org_idx on public.customers (organization_id);
