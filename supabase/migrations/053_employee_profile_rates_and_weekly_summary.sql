-- Ficha de usuario, tarifa por hora y resumen semanal del timecard.
-- Aplicado en vivo el 2026-09-15.

-- 1. Ficha equivalente a la de Construction Foreman.
alter table public.profiles
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists phone text,
  add column if not exists cell text,
  add column if not exists title text,
  add column if not exists weather_zip text,
  add column if not exists email_signature text,
  -- La zona horaria decide a que dia y semana pertenece un turno. No es cosmetica.
  add column if not exists time_zone text not null default 'America/New_York',
  -- CF no borra usuarios: los inactiva o archiva para conservar registros.
  add column if not exists status text not null default 'active';

alter table public.profiles drop constraint if exists profiles_status_check;
alter table public.profiles
  add constraint profiles_status_check
  check (status in ('active', 'inactive', 'archived'));

update public.profiles
   set first_name = coalesce(first_name, split_part(full_name, ' ', 1)),
       last_name = coalesce(last_name,
         nullif(trim(substring(full_name from position(' ' in full_name) + 1)), ''))
 where full_name is not null and (first_name is null or last_name is null);

-- 2. Tarifa y tipo de contrato, en tabla aparte para que la regla de
--    "solo owner/admin ven la tarifa" viva en la base y no en la interfaz.
create table if not exists public.employee_rates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  hourly_rate numeric(10,2) not null check (hourly_rate >= 0),
  -- W2 es empleado y le aplica FLSA (1.5x sobre 40 h/semana).
  -- 1099 es contratista: todas sus horas van a tarifa simple.
  employment_type text not null default 'w2',
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  unique (organization_id, profile_id)
);

alter table public.employee_rates drop constraint if exists employee_rates_employment_type_check;
alter table public.employee_rates
  add constraint employee_rates_employment_type_check
  check (employment_type in ('w2', '1099'));

alter table public.employee_rates enable row level security;

drop policy if exists select_employee_rates on public.employee_rates;
create policy select_employee_rates on public.employee_rates
  for select to authenticated
  using (exists (select 1 from public.organization_members m
                  where m.organization_id = employee_rates.organization_id
                    and m.profile_id = (select auth.uid())
                    and m.role in ('owner','admin')));

drop policy if exists write_employee_rates on public.employee_rates;
create policy write_employee_rates on public.employee_rates
  for all to authenticated
  using (exists (select 1 from public.organization_members m
                  where m.organization_id = employee_rates.organization_id
                    and m.profile_id = (select auth.uid())
                    and m.role in ('owner','admin')))
  with check (exists (select 1 from public.organization_members m
                       where m.organization_id = employee_rates.organization_id
                         and m.profile_id = (select auth.uid())
                         and m.role in ('owner','admin')));

create index if not exists employee_rates_profile_idx on public.employee_rates (profile_id);
