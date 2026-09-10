-- Plantillas de checklist editables por organizacion.
--
-- Hasta ahora las 13 tareas por camara estaban escritas en el codigo
-- (generateScopeTemplateTasks). Cada organizacion trabaja distinto: unas
-- necesitan mas pasos, otras menos. Esta tabla guarda SOLO la version propia
-- de una organizacion; si no hay fila, el codigo usa la lista por defecto de
-- src/lib/checklistTemplates.ts. Asi nadie pierde el comportamiento actual
-- por el hecho de existir esta tabla.

create table if not exists public.checklist_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  -- copper | fiber | wireless | existing | unknown
  communication_type text not null,
  -- [{ "title": "...", "taskType": "...", "templateKey": "..." }]
  items jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, communication_type)
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'checklist_templates_comm_type_check') then
    alter table public.checklist_templates
      add constraint checklist_templates_comm_type_check
      check (communication_type in ('copper', 'fiber', 'wireless', 'existing', 'unknown'));
  end if;

  -- items tiene que ser un arreglo: un objeto suelto reventaria el generador
  -- de tareas en tiempo de ejecucion, no al guardar.
  if not exists (select 1 from pg_constraint where conname = 'checklist_templates_items_is_array') then
    alter table public.checklist_templates
      add constraint checklist_templates_items_is_array
      check (jsonb_typeof(items) = 'array' and jsonb_array_length(items) <= 60);
  end if;
end $$;

alter table public.checklist_templates enable row level security;

drop policy if exists select_checklist_templates on public.checklist_templates;
create policy select_checklist_templates on public.checklist_templates for select using (
  exists (
    select 1 from organization_members om
    where om.organization_id = checklist_templates.organization_id and om.profile_id = auth.uid()));

drop policy if exists insert_checklist_templates on public.checklist_templates;
create policy insert_checklist_templates on public.checklist_templates for insert with check (
  exists (
    select 1 from organization_members om
    where om.organization_id = checklist_templates.organization_id and om.profile_id = auth.uid()));

drop policy if exists update_checklist_templates on public.checklist_templates;
create policy update_checklist_templates on public.checklist_templates for update using (
  exists (
    select 1 from organization_members om
    where om.organization_id = checklist_templates.organization_id and om.profile_id = auth.uid()));

drop policy if exists delete_checklist_templates on public.checklist_templates;
create policy delete_checklist_templates on public.checklist_templates for delete using (
  exists (
    select 1 from organization_members om
    where om.organization_id = checklist_templates.organization_id and om.profile_id = auth.uid()));

comment on table public.checklist_templates is
  'Checklist propio de la organizacion por tipo de conectividad. Sin fila = plantilla por defecto del codigo.';
comment on column public.checklist_templates.items is
  'Arreglo de { title, taskType, templateKey }. templateKey es la clave que evita duplicar tareas ya creadas.';
