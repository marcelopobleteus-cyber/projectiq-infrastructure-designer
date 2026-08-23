-- Migration: 011_project_disciplines.sql
-- Description: Adds explicit, queryable discipline tracking and an optional parent
-- (master project) relationship to public.projects.
--
-- Replaces three mechanisms that could not be read by the server:
--   1. the informal "[Type:xxx]" tag prepended to the free-text description
--   2. ProjectSidebar's projectId.includes('fiber') heuristic — impossible to match,
--      since project ids are UUIDs and 'fiber'/'cctv'/'wireless' etc. contain
--      characters outside the hex alphabet
--   3. localStorage, which is per-browser and invisible to every other viewer
--
-- Canonical discipline ids (must match PROJECT_TYPES in /projects/create and
-- ALL_DISCIPLINES in ProjectSidebar.tsx):
--   cctv, fiber, conduit, networking, wireless, power, lighting

-- 1. New columns
alter table public.projects
  add column if not exists disciplines text[] not null default '{}',
  add column if not exists parent_id   uuid references public.projects(id) on delete set null;

comment on column public.projects.disciplines is
  'Canonical discipline ids active for this project (cctv, fiber, conduit, networking, wireless, power, lighting). Empty = unset; the UI treats unset as "show every implemented module."';
comment on column public.projects.parent_id is
  'Optional parent "master" project this sub-project rolls up to, for a consolidated BOM and progress view. Null = independent project.';

-- 2. Indexes
create index if not exists projects_disciplines_idx on public.projects using gin (disciplines);
create index if not exists projects_parent_idx on public.projects (parent_id);

-- 3. Backfill from the legacy "[Type:xxx]" description tag.
--    'master' expands to the disciplines that currently have a real workspace built
--    for them; a single recognized tag becomes a one-item array; anything else
--    (no tag, unrecognized tag, or no description at all) is left as '{}' — which the
--    UI already treats as "show everything," so this is not a behavior change for
--    those rows.
update public.projects
   set disciplines = case
         when description like '[Type:master]%' then
           array['cctv', 'fiber', 'networking', 'wireless', 'power']
         when description ~ '^\[Type:(cctv|fiber|conduit|networking|wireless|power|lighting)\]' then
           array[substring(description from '^\[Type:([a-z]+)\]')]
         else '{}'
       end
 where disciplines = '{}';

-- 4. Strip the tag from the visible description now that it is redundant — it was
--    showing up verbatim ("[Type:master] ...") on every project card in /projects.
update public.projects
   set description = nullif(regexp_replace(description, '^\[Type:[a-z]+\]\s*', ''), '')
 where description like '[Type:%';
