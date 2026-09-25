-- Las horas dejan de redondearse turno por turno.
--
-- payroll_summary redondeaba cada turno a 2 decimales ANTES de sumarlos. Un dia
-- de 8:08 (8.1333 h) se guardaba como 8.13, y esas centesimas se perdian en cada
-- jornada. En un periodo de 9 dias la diferencia fue de 0.01 h y 27 centavos, y
-- siempre a favor de quien paga. Con una cuadrilla y un ano de por medio deja de
-- ser anecdota.
--
-- Ahora la suma se hace con precision completa y el redondeo ocurre UNA sola vez,
-- sobre el dinero. Las horas se devuelven con 4 decimales: la pantalla las
-- muestra con 2, pero el calculo ya no las pierde.

-- Se hace DROP antes: total_hours pasa de 2 a 4 decimales y Postgres no deja
-- cambiar el tipo de retorno de una funcion existente con CREATE OR REPLACE.
drop function if exists public.payroll_summary(uuid, date, date);

create function public.payroll_summary(
  p_organization_id uuid, p_from date, p_to date
)
returns table (
  profile_id uuid, full_name text, week_start date, employment_type text,
  regular_hours numeric, overtime_hours numeric, total_hours numeric,
  hourly_rate numeric, regular_cost numeric, overtime_cost numeric, total_cost numeric
)
language plpgsql security definer set search_path = public as $$
declare v_is_manager boolean;
begin
  select exists (select 1 from public.organization_members m
                  where m.organization_id = p_organization_id
                    and m.profile_id = auth.uid() and m.role in ('owner','admin'))
    into v_is_manager;
  if not v_is_manager then return; end if;

  return query
  with turnos as (
    select e.profile_id,
      (e.clock_in at time zone coalesce(p.time_zone,'America/New_York'))::date as dia_local,
      date_trunc('week', (e.clock_in at time zone coalesce(p.time_zone,'America/New_York')))::date as semana,
      -- Sin round(): la precision se conserva hasta la suma.
      greatest(extract(epoch from (e.clock_out - e.clock_in))/3600.0
               - coalesce(e.paused_minutes,0)/60.0, 0)::numeric as horas
    from public.time_entries e
    join public.profiles p on p.id = e.profile_id
    where e.organization_id = p_organization_id and e.clock_out is not null
  ),
  por_semana as (
    select t.profile_id, t.semana, sum(t.horas) as horas
      from turnos t where t.dia_local between p_from and p_to
     group by t.profile_id, t.semana
  ),
  calc as (
    select w.profile_id, w.semana,
      coalesce(r.employment_type,'w2') as tipo,
      case when coalesce(r.employment_type,'w2')='w2' then least(w.horas,40) else w.horas end as reg,
      case when coalesce(r.employment_type,'w2')='w2' then greatest(w.horas-40,0) else 0 end as ot,
      w.horas, r.hourly_rate
    from por_semana w
    left join public.employee_rates r
      on r.profile_id = w.profile_id and r.organization_id = p_organization_id
  )
  select c.profile_id, coalesce(pr.full_name, pr.email, 'Sin nombre')::text, c.semana, c.tipo,
    round(c.reg, 4), round(c.ot, 4), round(c.horas, 4), c.hourly_rate,
    case when c.hourly_rate is not null then round(c.reg * c.hourly_rate, 2) end,
    case when c.hourly_rate is not null then round(c.ot * c.hourly_rate * 1.5, 2) end,
    case when c.hourly_rate is not null
         then round(c.reg * c.hourly_rate + c.ot * c.hourly_rate * 1.5, 2) end
  from calc c
  join public.profiles pr on pr.id = c.profile_id
  order by coalesce(pr.full_name, pr.email), c.semana;
end; $$;

grant execute on function public.payroll_summary(uuid, date, date) to authenticated;

comment on function public.payroll_summary is
  'Horas y costo por empleado y semana. Suma con precision completa; el redondeo ocurre solo sobre el dinero.';
