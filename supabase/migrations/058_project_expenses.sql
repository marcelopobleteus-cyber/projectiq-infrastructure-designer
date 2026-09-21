-- Gastos de proyecto: combustible, materiales, peajes, lo que se gaste en obra.
-- Aplicado en vivo 2026-09-21.
--
-- Version deliberadamente mas simple que Construction Foreman. CF pide Item Type,
-- Category, Expense Account, Vendor, Cost Code, Ref # y Reason -- siete campos que
-- en la practica quedan vacios o en "Uncategorized Asset". Aqui queda UNA
-- categoria, el proveedor como texto libre, y la foto del recibo, que es lo unico
-- que realmente se necesita para reembolsar y para que el contable lo cruce.

insert into storage.buckets (id, name, public)
values ('expense-receipts', 'expense-receipts', false)
on conflict (id) do nothing;

create table if not exists public.project_expenses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  -- Nullable a proposito: un gasto de oficina o un peaje no siempre pertenece a
  -- una obra, y obligarlo llevaria a imputarlo mal con tal de poder guardarlo.
  project_id uuid references public.projects(id) on delete set null,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  spent_on date not null default current_date,
  description text not null,
  amount numeric(12,2) not null,
  category text not null default 'other',
  vendor text,
  notes text,
  -- Facturable = se le cobra al cliente como reembolso en la factura.
  billable boolean not null default false,
  receipt_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

alter table public.project_expenses drop constraint if exists project_expenses_amount_check;
alter table public.project_expenses add constraint project_expenses_amount_check
  check (amount > 0);

alter table public.project_expenses drop constraint if exists project_expenses_category_check;
alter table public.project_expenses add constraint project_expenses_category_check
  check (category in ('fuel','material','equipment','tools','permit','travel','meals','other'));

create index if not exists project_expenses_org_date_idx on public.project_expenses (organization_id, spent_on);
create index if not exists project_expenses_project_idx on public.project_expenses (project_id);
create index if not exists project_expenses_profile_idx on public.project_expenses (profile_id);

alter table public.project_expenses enable row level security;

-- Cualquier miembro ve los gastos de su organizacion: el costo del proyecto no es
-- secreto para la cuadrilla, y esconderlo solo hace que se registren por WhatsApp.
drop policy if exists select_project_expenses on public.project_expenses;
create policy select_project_expenses on public.project_expenses
  for select to authenticated
  using (exists (select 1 from public.organization_members m
                  where m.organization_id = project_expenses.organization_id
                    and m.profile_id = (select auth.uid())));

-- Cada uno carga y edita LO SUYO; owner/admin pueden tocar el de cualquiera.
-- Un empleado no deberia poder cambiar el gasto que cargo otro.
drop policy if exists insert_project_expenses on public.project_expenses;
create policy insert_project_expenses on public.project_expenses
  for insert to authenticated
  with check (exists (select 1 from public.organization_members m
                       where m.organization_id = project_expenses.organization_id
                         and m.profile_id = (select auth.uid()))
              and (profile_id = (select auth.uid())
                   or exists (select 1 from public.organization_members m2
                               where m2.organization_id = project_expenses.organization_id
                                 and m2.profile_id = (select auth.uid())
                                 and m2.role in ('owner','admin'))));

drop policy if exists update_project_expenses on public.project_expenses;
create policy update_project_expenses on public.project_expenses
  for update to authenticated
  using (profile_id = (select auth.uid())
         or exists (select 1 from public.organization_members m
                     where m.organization_id = project_expenses.organization_id
                       and m.profile_id = (select auth.uid())
                       and m.role in ('owner','admin')));

drop policy if exists delete_project_expenses on public.project_expenses;
create policy delete_project_expenses on public.project_expenses
  for delete to authenticated
  using (profile_id = (select auth.uid())
         or exists (select 1 from public.organization_members m
                     where m.organization_id = project_expenses.organization_id
                       and m.profile_id = (select auth.uid())
                       and m.role in ('owner','admin')));

-- Storage: los recibos viven bajo expense-receipts/<organization_id>/...
drop policy if exists "expense_receipts_select" on storage.objects;
create policy "expense_receipts_select" on storage.objects
  for select using (
    bucket_id = 'expense-receipts'
    and (storage.foldername(name))[1] in (
      select m.organization_id::text from public.organization_members m
       where m.profile_id = auth.uid()
    )
  );

drop policy if exists "expense_receipts_insert" on storage.objects;
create policy "expense_receipts_insert" on storage.objects
  for insert with check (
    bucket_id = 'expense-receipts'
    and (storage.foldername(name))[1] in (
      select m.organization_id::text from public.organization_members m
       where m.profile_id = auth.uid()
    )
  );

drop policy if exists "expense_receipts_delete" on storage.objects;
create policy "expense_receipts_delete" on storage.objects
  for delete using (
    bucket_id = 'expense-receipts'
    and (storage.foldername(name))[1] in (
      select m.organization_id::text from public.organization_members m
       where m.profile_id = auth.uid()
    )
  );
