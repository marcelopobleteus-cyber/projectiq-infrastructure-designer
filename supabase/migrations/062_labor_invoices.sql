-- Historial de facturas de labor.
--
-- Hasta ahora la pantalla de nomina calculaba el periodo y generaba el PDF al
-- vuelo: al cambiar las fechas no quedaba rastro de que se hubiera emitido algo.
-- No habia forma de revisar lo facturado en agosto ni de cruzarlo contra lo que
-- el cliente deposito.
--
-- La tabla `invoices` que ya existe NO sirve para esto: exige project_id y cuelga
-- de un contrato, porque cobra UN proyecto. Una factura de labor cubre un
-- PERIODO que cruza varios proyectos. Son documentos distintos.
--
-- El campo `detail` guarda una FOTO CONGELADA del calculo al momento de emitir.
-- Es deliberado: si manana se corrige una hora del mes pasado, la factura que ya
-- se envio y que ya pagaron no puede cambiar de monto. Un historial que se
-- recalcula no respalda nada.

create table if not exists public.labor_invoices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  invoice_number text not null,
  invoice_date date not null,
  period_from date not null,
  period_to date not null,
  payment_terms text,
  project_or_po text,
  total_hours numeric(10,4) not null default 0,
  labor_subtotal numeric(12,2) not null default 0,
  reimbursements numeric(12,2) not null default 0,
  other_or_tax numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  status text not null default 'issued',
  paid_on date,
  notes text,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

do $$ begin
  if not exists (select 1 from pg_constraint where conname='labor_invoices_status_check') then
    alter table public.labor_invoices add constraint labor_invoices_status_check
      check (status in ('issued','sent','paid','void'));
  end if;
  -- paid_on solo tiene sentido cuando esta pagada, y si esta pagada tiene fecha.
  if not exists (select 1 from pg_constraint where conname='labor_invoices_paid_check') then
    alter table public.labor_invoices add constraint labor_invoices_paid_check
      check ((status = 'paid') = (paid_on is not null));
  end if;
  if not exists (select 1 from pg_constraint where conname='labor_invoices_period_check') then
    alter table public.labor_invoices add constraint labor_invoices_period_check
      check (period_to >= period_from);
  end if;
end $$;

-- Dos facturas con el mismo numero en la misma empresa serian dos verdades.
create unique index if not exists labor_invoices_number_uniq
  on public.labor_invoices (organization_id, invoice_number);

create index if not exists labor_invoices_period_idx
  on public.labor_invoices (organization_id, period_from desc);

alter table public.labor_invoices enable row level security;

-- Una factura expone tarifas y costo de labor, asi que se restringe igual que la
-- nomina: solo owner y admin. No basta con esconderlo en la interfaz.
drop policy if exists labor_invoices_select on public.labor_invoices;
create policy labor_invoices_select on public.labor_invoices for select using (
  exists (select 1 from public.organization_members m
           where m.organization_id = labor_invoices.organization_id
             and m.profile_id = (select auth.uid()) and m.role in ('owner','admin')));

drop policy if exists labor_invoices_insert on public.labor_invoices;
create policy labor_invoices_insert on public.labor_invoices for insert with check (
  exists (select 1 from public.organization_members m
           where m.organization_id = labor_invoices.organization_id
             and m.profile_id = (select auth.uid()) and m.role in ('owner','admin')));

drop policy if exists labor_invoices_update on public.labor_invoices;
create policy labor_invoices_update on public.labor_invoices for update using (
  exists (select 1 from public.organization_members m
           where m.organization_id = labor_invoices.organization_id
             and m.profile_id = (select auth.uid()) and m.role in ('owner','admin')));

drop policy if exists labor_invoices_delete on public.labor_invoices;
create policy labor_invoices_delete on public.labor_invoices for delete using (
  exists (select 1 from public.organization_members m
           where m.organization_id = labor_invoices.organization_id
             and m.profile_id = (select auth.uid()) and m.role in ('owner','admin')));

comment on table public.labor_invoices is
  'Facturas de labor emitidas por periodo. detail es una foto congelada del calculo: no se recalcula.';
comment on column public.labor_invoices.detail is
  'Snapshot al emitir: lineas por semana, dias trabajados y gastos incluidos.';
