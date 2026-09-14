-- 1. project_section: la app la escribe y la lee desde hace tiempo
--    (createProject la inserta, ProjectSidebar la consulta) pero la columna
--    nunca llego a la base. El insert fallaba en silencio porque su error no se
--    revisaba, y createProject terminaba redirigiendo a un id inventado: crear
--    un proyecto estaba roto.
alter table public.projects
  add column if not exists project_section text not null default 'its';

alter table public.projects
  drop constraint if exists projects_project_section_check;

alter table public.projects
  add constraint projects_project_section_check
  check (project_section in ('its', 'fiber', 'tower'));

-- 2. job_number: el numero de obra, aparte del nombre, como en Construction
--    Foreman. Va separado del nombre para poder buscar y ordenar por el, y para
--    que sobreviva si el proyecto se renombra. Unico dentro de cada
--    organizacion, no global.
--
--    El formato NO se fuerza a NN-NNN a proposito. Los trabajos propios de NGT
--    usan ano-correlativo (26-012, creado en 2026), pero los de un prime como
--    Mastec llevan el numero del cliente (MT. OLIVE = 10016414, ocho digitos
--    sin guion). Un CHECK de NN-NNN habria impedido migrarlos.
alter table public.projects
  add column if not exists job_number text;

alter table public.projects
  drop constraint if exists projects_job_number_format_check;

alter table public.projects
  add constraint projects_job_number_format_check
  check (
    job_number is null
    or (job_number ~ '^[A-Za-z0-9][A-Za-z0-9_-]{0,19}$')
  );

create unique index if not exists projects_org_job_number_key
  on public.projects (organization_id, job_number)
  where job_number is not null;
