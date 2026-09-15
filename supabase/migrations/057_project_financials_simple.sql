-- Capa financiera simple: contrato -> facturas -> pagos. Aplicado en vivo 2026-09-15.
--
-- Deliberadamente SIN AIA/G702, SOV, retencion ni ordenes de cambio. Lo unico que
-- persigue este modulo es responder tres preguntas: cuanto se acordo, cuanto se
-- facturo, cuanto se pago. La factura legal se emite donde el usuario lleva su
-- contabilidad; aqui solo se registra que existe, por cuanto y cuando vence.
-- Todo lo demas se agrega despues y solo si un cliente lo exige.

create table if not exists public.contracts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  contract_number text,
  amount numeric(14,2) not null default 0,
  payment_terms text not null default 'net_30',
  signed_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

alter table public.contracts drop constraint if exists contracts_terms_check;
alter table public.contracts add constraint contracts_terms_check
  check (payment_terms in ('due_on_receipt','net_15','net_30','net_45','net_60'));

-- Un contrato por proyecto. Si manana se necesitan varios, se quita este indice;
-- partir por uno evita toda la ambiguedad de "a que contrato pertenece esta factura".
create unique index if not exists contracts_one_per_project on public.contracts (project_id);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  contract_id uuid references public.contracts(id) on delete set null,
  invoice_number text,
  issue_date date not null default current_date,
  due_date date,
  amount numeric(14,2) not null default 0,
  description text,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

alter table public.invoices drop constraint if exists invoices_status_check;
alter table public.invoices add constraint invoices_status_check
  check (status in ('draft','sent','partial','paid','void'));

create index if not exists invoices_project_idx on public.invoices (project_id);
create index if not exists invoices_org_idx on public.invoices (organization_id);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  amount numeric(14,2) not null default 0,
  received_at date not null default current_date,
  method text not null default 'check',
  reference text,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.payments drop constraint if exists payments_method_check;
alter table public.payments add constraint payments_method_check
  check (method in ('check','ach','wire','card','cash','other'));

create index if not exists payments_invoice_idx on public.payments (invoice_id);

-- RLS: leer cualquier miembro de la organizacion; escribir solo owner/admin/editor,
-- igual que customers.
do $$
declare t text;
begin
  foreach t in array array['contracts','invoices','payments'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists select_%I on public.%I', t, t);
    execute format($p$create policy select_%I on public.%I for select to authenticated
      using (exists (select 1 from public.organization_members m
                      where m.organization_id = %I.organization_id
                        and m.profile_id = (select auth.uid())))$p$, t, t, t);
    execute format('drop policy if exists write_%I on public.%I', t, t);
    execute format($p$create policy write_%I on public.%I for all to authenticated
      using (exists (select 1 from public.organization_members m
                      where m.organization_id = %I.organization_id
                        and m.profile_id = (select auth.uid())
                        and m.role in ('owner','admin','editor')))
      with check (exists (select 1 from public.organization_members m
                           where m.organization_id = %I.organization_id
                             and m.profile_id = (select auth.uid())
                             and m.role in ('owner','admin','editor')))$p$, t, t, t, t);
  end loop;
end $$;

-- Resumen por proyecto. Se calcula en la base para que la pantalla no tenga que
-- sumar en el cliente y para que el resumen por cliente sea una sola consulta.
create or replace view public.project_financial_summary as
select
  p.id                                   as project_id,
  p.organization_id,
  p.customer_id,
  coalesce(c.amount, 0)                  as contract_amount,
  coalesce(i.invoiced, 0)                as invoiced,
  coalesce(i.paid, 0)                    as paid,
  coalesce(i.invoiced, 0) - coalesce(i.paid, 0) as receivable,
  coalesce(c.amount, 0) - coalesce(i.invoiced, 0) as remaining_to_bill,
  coalesce(i.overdue, 0)                 as overdue
from public.projects p
left join public.contracts c on c.project_id = p.id
left join (
  select
    inv.project_id,
    sum(inv.amount) filter (where inv.status <> 'void')                    as invoiced,
    coalesce(sum(pay.total), 0)                                            as paid,
    sum(inv.amount - coalesce(pay.total, 0)) filter (
      where inv.status not in ('void','draft','paid')
        and inv.due_date is not null
        and inv.due_date < current_date
    )                                                                      as overdue
  from public.invoices inv
  left join lateral (
    select sum(amount) as total from public.payments where invoice_id = inv.id
  ) pay on true
  group by inv.project_id
) i on i.project_id = p.id;

grant select on public.project_financial_summary to authenticated;
