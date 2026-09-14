-- Registro persistente de inicios de sesion.
-- auth.users.last_sign_in_at solo guarda el ULTIMO ingreso y auth.audit_log_entries
-- esta vacia en este proyecto, asi que no existia historial. Este trigger escribe
-- una fila en activity_log cada vez que un usuario inicia sesion, sin importar por
-- que puerta entre (escritorio, /field, magic link): GoTrue actualiza
-- last_sign_in_at en todos los casos.

create or replace function public.log_user_sign_in()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_org uuid;
begin
  if new.last_sign_in_at is null
     or new.last_sign_in_at is not distinct from old.last_sign_in_at then
    return new;
  end if;

  -- activity_log.organization_id es NOT NULL: si el usuario todavia no pertenece a
  -- ninguna organizacion no hay donde archivar el evento. La pestana de Accesos
  -- igual lo muestra, porque lee last_sign_in_at directo de auth.users.
  select om.organization_id
    into v_org
    from public.organization_members om
   where om.profile_id = new.id
   order by om.created_at
   limit 1;

  if v_org is null then
    return new;
  end if;

  insert into public.activity_log (organization_id, actor_id, action, entity_type, entity_id, metadata, created_at)
  values (
    v_org,
    new.id,
    'user.signed_in',
    'auth',
    new.id,
    jsonb_build_object('email', new.email, 'source', 'trigger'),
    new.last_sign_in_at
  );

  return new;
exception when others then
  -- Nunca bloquear un login por un fallo del registro.
  return new;
end;
$$;

drop trigger if exists on_auth_user_sign_in on auth.users;
create trigger on_auth_user_sign_in
  after update of last_sign_in_at on auth.users
  for each row execute function public.log_user_sign_in();

-- Sembrar los ingresos que ya conocemos (uno por usuario, el ultimo registrado).
insert into public.activity_log (organization_id, actor_id, action, entity_type, entity_id, metadata, created_at)
select om.organization_id, u.id, 'user.signed_in', 'auth', u.id,
       jsonb_build_object('email', u.email, 'source', 'backfill'),
       u.last_sign_in_at
  from auth.users u
  join lateral (
    select organization_id from public.organization_members m
     where m.profile_id = u.id order by m.created_at limit 1
  ) om on true
 where u.last_sign_in_at is not null
   and not exists (
     select 1 from public.activity_log a
      where a.actor_id = u.id and a.action = 'user.signed_in'
        and a.created_at = u.last_sign_in_at
   );

-- Resumen por usuario para la pestana de Accesos en Administracion.
create or replace function public.admin_user_sign_in_stats()
returns table (
  user_id uuid,
  email text,
  full_name text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  active_sessions bigint,
  sign_in_count bigint,
  organization_names text[]
)
language sql
security definer
set search_path = public, auth
as $$
  select
    u.id,
    u.email::text,
    p.full_name,
    u.created_at,
    u.last_sign_in_at,
    (select count(*) from auth.sessions s where s.user_id = u.id),
    (select count(*) from public.activity_log a where a.actor_id = u.id and a.action = 'user.signed_in'),
    coalesce(
      (select array_agg(o.name order by o.name)
         from public.organization_members m
         join public.organizations o on o.id = m.organization_id
        where m.profile_id = u.id),
      '{}'::text[]
    )
  from auth.users u
  left join public.profiles p on p.id = u.id
  where exists (
    select 1 from public.profiles me
     where me.id = auth.uid() and me.is_platform_admin
  )
  order by u.last_sign_in_at desc nulls last;
$$;

revoke all on function public.admin_user_sign_in_stats() from public;
grant execute on function public.admin_user_sign_in_stats() to authenticated;
