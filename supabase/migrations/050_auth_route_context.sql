-- El middleware corre en cada peticion y hacia dos consultas en fila:
-- profiles (is_platform_admin) y luego organization_members + organizations
-- (suspension). Las dos dependen solo de auth.uid(), asi que caben en una
-- sola llamada y un solo viaje a la base.
create or replace function public.auth_route_context()
returns table (is_platform_admin boolean, workspace_blocked boolean)
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce((select p.is_platform_admin from public.profiles p where p.id = auth.uid()), false),
    coalesce((
      select (o.status = 'suspended' or o.billing_status = 'canceled')
        from public.organization_members m
        join public.organizations o on o.id = m.organization_id
       where m.profile_id = auth.uid()
       order by m.created_at
       limit 1
    ), false);
$$;

revoke all on function public.auth_route_context() from public;
grant execute on function public.auth_route_context() to authenticated;
