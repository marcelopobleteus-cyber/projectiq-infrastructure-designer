-- Alto nivel de producto/vertical al que pertenece un proyecto: ITS & Traffic
-- Signal (incluye CCTV), Fiber & Outside Plant, o Wireless & Tower
-- Construction. Ver claude/plan-secciones-its-fiber-wireless.md en el
-- proyecto de Claude para el detalle de la investigacion de mercado detras
-- de esta division en 3 secciones.
--
-- Es un dato distinto de `disciplines` (que ya existia desde la migracion
-- 011): `project_section` es la categoria comercial de mas alto nivel que se
-- elige primero al crear el proyecto, y determina que disciplinas se ofrecen
-- despues. Todos los proyectos existentes son de tipo CCTV/ITS, por eso el
-- default y el backfill son 'its'.

alter table public.projects
  add column if not exists project_section text not null default 'its'
    check (project_section in ('its', 'fiber', 'tower'));

update public.projects set project_section = 'its' where project_section is null;

comment on column public.projects.project_section is
  'Product vertical: its (ITS & Traffic Signal, includes CCTV), fiber (Fiber & Outside Plant), tower (Wireless & Tower Construction). Chosen at project creation; drives which disciplines/modules are offered.';
