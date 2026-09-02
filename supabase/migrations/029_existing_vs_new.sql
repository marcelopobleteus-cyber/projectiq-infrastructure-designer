-- 029_existing_vs_new.sql
-- Aplicada en produccion (fkokqccxhljbuqyutkxi) el 2026-09-01.
--
-- Distincion EXISTENTE vs NUEVO en todo elemento fisico.
-- Dos ejes ortogonales, no uno:
--   asset_condition = el elemento fisico ya estaba en terreno o no
--   work_scope      = que trabajo se hace sobre el
--
-- Un poste existente al que se le monta camara nueva es ('existing','modify').
-- El main haul reutilizado para tirar fibra es ('existing','reuse').
-- Un bore nuevo es ('new','install').
--
-- Regla de facturacion que habilita:
--   install/replace -> material + mano de obra
--   reuse/modify    -> solo mano de obra
--   reference       -> no genera nada, es contexto de plano

do $$ begin
  create type asset_condition as enum ('existing','new','unknown');
exception when duplicate_object then null; end $$;

do $$ begin
  create type work_scope as enum ('reference','reuse','modify','install','replace','remove');
exception when duplicate_object then null; end $$;

do $$
declare t text;
begin
  foreach t in array array[
    'conduit_runs','conduit_structures','fiber_routes','fiber_nodes',
    'fiber_cables','camera_locations','network_devices','cabinets'
  ] loop
    execute format(
      'alter table public.%1$I
         add column if not exists asset_condition asset_condition not null default ''unknown'',
         add column if not exists work_scope work_scope not null default ''install'',
         add column if not exists condition_source text,
         add column if not exists owner_of_record text', t);
    execute format(
      'create index if not exists %1$s_condition_idx on public.%1$I (project_id, asset_condition, work_scope)', t);
  end loop;
end $$;

comment on type asset_condition is 'El activo fisico ya existia en terreno (existing) o se instala en este proyecto (new).';
comment on type work_scope is 'Alcance del trabajo. Solo install/replace generan material en el BOM; reuse/modify generan solo mano de obra; reference no genera nada.';

alter table public.bom_items
  add column if not exists work_scope work_scope not null default 'install';

-- ============================================================
-- Backfill del Beltline, solo con lo declarado explicitamente.
-- El resto queda 'unknown' a proposito: se confirma en el mapa,
-- no se cobra por suposicion.
-- ============================================================

-- "los main haul y el conducto que los une no son nuevos, se reutilizaron"
update public.conduit_structures set asset_condition='existing', work_scope='reuse',
       condition_source='declarado por el usuario 2026-09-01'
 where structure_type='manhole';
update public.fiber_nodes set asset_condition='existing', work_scope='reuse',
       condition_source='declarado por el usuario 2026-09-01'
 where node_type in ('Manhole','Existing Fiber Source');

-- "los postes ya son existentes, fue actualizacion de camaras"
update public.fiber_nodes set asset_condition='existing', work_scope='modify',
       condition_source='declarado por el usuario 2026-09-01'
 where node_type='Pole';

update public.camera_locations set asset_condition='new', work_scope='install',
       condition_source='declarado por el usuario 2026-09-01';
update public.cabinets set asset_condition='new', work_scope='install',
       condition_source='declarado por el usuario 2026-09-01';

update public.bom_items b set work_scope = s.work_scope
from public.conduit_structures s
where b.conduit_structure_id = s.id and s.asset_condition='existing';
