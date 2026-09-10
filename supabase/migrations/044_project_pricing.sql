-- Margen e impuesto por proyecto.
--
-- Hasta ahora el BOM mostraba COSTO y nada mas: lo que nos cuesta comprar e
-- instalar. Lo que se le entrega al cliente es un precio, que es otra cosa.
-- Sin esto, el PDF de la fase 1 entrega costo interno a un cliente, que es
-- justamente lo que no se quiere.
--
-- Sin fila para un proyecto, todos los porcentajes son cero y el BOM se
-- comporta exactamente como hoy. Nadie ve precios nuevos por sorpresa.
--
-- markup y margin NO son lo mismo y confundirlos cuesta plata:
--   markup 20% sobre costo 100  -> precio 120  (ganancia 16.7% del precio)
--   margin 20% sobre costo 100  -> precio 125  (ganancia 20%   del precio)
-- Por eso el modo se elige explicitamente en vez de asumirlo.

create table if not exists public.project_pricing (
  project_id uuid primary key references public.projects(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  pricing_mode text not null default 'markup',
  material_markup_pct numeric not null default 0,
  labor_markup_pct numeric not null default 0,
  tax_pct numeric not null default 0,
  tax_applies_to_labor boolean not null default false,
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'project_pricing_mode_check') then
    alter table public.project_pricing add constraint project_pricing_mode_check
      check (pricing_mode in ('markup', 'margin'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'project_pricing_ranges_check') then
    alter table public.project_pricing add constraint project_pricing_ranges_check
      check (
        material_markup_pct >= 0 and material_markup_pct <= 500
        and labor_markup_pct >= 0 and labor_markup_pct <= 500
        and tax_pct >= 0 and tax_pct <= 100
      );
  end if;
end $$;

alter table public.project_pricing enable row level security;

drop policy if exists select_project_pricing on public.project_pricing;
create policy select_project_pricing on public.project_pricing for select using (
  exists (select 1 from organization_members om
    where om.organization_id = project_pricing.organization_id and om.profile_id = auth.uid()));

drop policy if exists insert_project_pricing on public.project_pricing;
create policy insert_project_pricing on public.project_pricing for insert with check (
  exists (select 1 from organization_members om
    where om.organization_id = project_pricing.organization_id and om.profile_id = auth.uid()));

drop policy if exists update_project_pricing on public.project_pricing;
create policy update_project_pricing on public.project_pricing for update using (
  exists (select 1 from organization_members om
    where om.organization_id = project_pricing.organization_id and om.profile_id = auth.uid()));

drop policy if exists delete_project_pricing on public.project_pricing;
create policy delete_project_pricing on public.project_pricing for delete using (
  exists (select 1 from organization_members om
    where om.organization_id = project_pricing.organization_id and om.profile_id = auth.uid()));

comment on table public.project_pricing is
  'Margen e impuesto por proyecto. Sin fila = todo en cero, o sea el BOM sigue mostrando costo.';
comment on column public.project_pricing.pricing_mode is
  'markup: precio = costo * (1 + pct). margin: precio = costo / (1 - pct). No son lo mismo y se elige explicitamente.';
