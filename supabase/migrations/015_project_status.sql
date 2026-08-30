-- Migration: 015_project_status.sql
-- Description: Adds a database-backed project status lifecycle enum column to public.projects,
-- indexes it, and backfills existing rows based on task completion.

-- 1. Create project_status ENUM type
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'project_status') THEN
    CREATE TYPE public.project_status AS ENUM (
      'planning',
      'in_progress',
      'on_hold',
      'completed',
      'closed'
    );
  END IF;
END $$;

-- 2. Add status column to public.projects
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS status public.project_status NOT NULL DEFAULT 'planning';

-- 3. Create index for fast status queries
CREATE INDEX IF NOT EXISTS projects_status_idx ON public.projects (status);

-- 4. Comment on column
COMMENT ON COLUMN public.projects.status IS
  'Project lifecycle stage. planning/in_progress/completed are meant to auto-track task progress; on_hold and closed are manual-only states a user sets explicitly.';

-- 5. Backfill existing rows based on camera_tasks completion
-- If project has 0 tasks -> 'planning'
-- If project has tasks & 100% are complete -> 'completed'
-- If project has tasks & < 100% complete -> 'in_progress'
-- Never backfill to on_hold or closed.
WITH project_task_stats AS (
  SELECT
    p.id AS project_id,
    COUNT(ct.id) AS total_tasks,
    COUNT(CASE WHEN ct.status = 'Complete' THEN 1 END) AS complete_tasks
  FROM public.projects p
  LEFT JOIN public.camera_tasks ct ON ct.project_id = p.id
  GROUP BY p.id
)
UPDATE public.projects p
SET status = CASE
  WHEN pts.total_tasks = 0 THEN 'planning'::public.project_status
  WHEN pts.total_tasks > 0 AND pts.complete_tasks = pts.total_tasks THEN 'completed'::public.project_status
  ELSE 'in_progress'::public.project_status
END
FROM project_task_stats pts
WHERE p.id = pts.project_id
  AND p.status NOT IN ('on_hold', 'closed');
