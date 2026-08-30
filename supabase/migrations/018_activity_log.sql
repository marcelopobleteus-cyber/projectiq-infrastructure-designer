-- Migration: 018_activity_log.sql
-- Description: Creates public.activity_log table, indexes, RLS policies, and a generic Postgres
-- trigger function that logs project writes and team administration events.

-- 1. Create activity_log table
CREATE TABLE IF NOT EXISTS public.activity_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
    actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    action text NOT NULL,
    entity_type text NOT NULL,
    entity_id uuid,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS activity_log_project_idx ON public.activity_log (project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS activity_log_org_idx ON public.activity_log (organization_id, created_at DESC);

ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS select_activity_log ON public.activity_log;
CREATE POLICY select_activity_log ON public.activity_log FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.organization_members WHERE organization_id = public.activity_log.organization_id AND profile_id = auth.uid()
));

-- 2. Generic Postgres trigger function for activity logging
CREATE OR REPLACE FUNCTION public.log_entity_activity()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_org_id uuid;
    v_project_id uuid;
    v_actor_id uuid;
    v_action text;
    v_entity_id uuid;
    v_metadata jsonb;
BEGIN
    v_actor_id := auth.uid();
    v_action := lower(TG_OP); -- 'insert', 'update', 'delete'

    IF TG_TABLE_NAME = 'projects' THEN
        IF TG_OP = 'DELETE' THEN
            v_org_id := OLD.organization_id;
            v_project_id := OLD.id;
            v_entity_id := OLD.id;
            v_metadata := jsonb_build_object('name', OLD.name);
        ELSE
            v_org_id := NEW.organization_id;
            v_project_id := NEW.id;
            v_entity_id := NEW.id;
            v_metadata := jsonb_build_object('name', NEW.name);
        END IF;

    ELSIF TG_TABLE_NAME = 'organization_members' THEN
        IF TG_OP = 'DELETE' THEN
            v_org_id := OLD.organization_id;
            v_entity_id := OLD.id;
            v_action := 'member.removed';
            v_metadata := jsonb_build_object('profile_id', OLD.profile_id, 'role', OLD.role);
        ELSIF TG_OP = 'UPDATE' THEN
            v_org_id := NEW.organization_id;
            v_entity_id := NEW.id;
            v_action := 'member.role_changed';
            v_metadata := jsonb_build_object('profile_id', NEW.profile_id, 'old_role', OLD.role, 'new_role', NEW.role);
        ELSE
            v_org_id := NEW.organization_id;
            v_entity_id := NEW.id;
            v_action := 'member.added';
            v_metadata := jsonb_build_object('profile_id', NEW.profile_id, 'role', NEW.role);
        END IF;

    ELSIF TG_TABLE_NAME = 'organization_invites' THEN
        IF TG_OP = 'INSERT' THEN
            v_org_id := NEW.organization_id;
            v_entity_id := NEW.id;
            v_action := 'member.invited';
            v_metadata := jsonb_build_object('email', NEW.email, 'role', NEW.role);
        ELSE
            RETURN NULL;
        END IF;

    ELSE
        -- Project child tables (field_tasks, camera_tasks, camera_locations, bom_items, network_devices, etc.)
        IF TG_OP = 'DELETE' THEN
            v_project_id := OLD.project_id;
            v_entity_id := OLD.id;
        ELSE
            v_project_id := NEW.project_id;
            v_entity_id := NEW.id;
        END IF;

        IF v_project_id IS NOT NULL THEN
            SELECT organization_id INTO v_org_id FROM public.projects WHERE id = v_project_id;
        END IF;

        v_metadata := jsonb_build_object('table', TG_TABLE_NAME);
    END IF;

    IF v_org_id IS NOT NULL THEN
        INSERT INTO public.activity_log (organization_id, project_id, actor_id, action, entity_type, entity_id, metadata)
        VALUES (v_org_id, v_project_id, v_actor_id, v_action, TG_TABLE_NAME, v_entity_id, v_metadata);
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 3. Attach triggers to key tables
DROP TRIGGER IF EXISTS trg_activity_projects ON public.projects;
CREATE TRIGGER trg_activity_projects AFTER INSERT OR UPDATE OR DELETE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.log_entity_activity();

DROP TRIGGER IF EXISTS trg_activity_field_tasks ON public.field_tasks;
CREATE TRIGGER trg_activity_field_tasks AFTER INSERT OR UPDATE OR DELETE ON public.field_tasks FOR EACH ROW EXECUTE FUNCTION public.log_entity_activity();

DROP TRIGGER IF EXISTS trg_activity_camera_tasks ON public.camera_tasks;
CREATE TRIGGER trg_activity_camera_tasks AFTER INSERT OR UPDATE OR DELETE ON public.camera_tasks FOR EACH ROW EXECUTE FUNCTION public.log_entity_activity();

DROP TRIGGER IF EXISTS trg_activity_bom_items ON public.bom_items;
CREATE TRIGGER trg_activity_bom_items AFTER INSERT OR UPDATE OR DELETE ON public.bom_items FOR EACH ROW EXECUTE FUNCTION public.log_entity_activity();

DROP TRIGGER IF EXISTS trg_activity_camera_locations ON public.camera_locations;
CREATE TRIGGER trg_activity_camera_locations AFTER INSERT OR UPDATE OR DELETE ON public.camera_locations FOR EACH ROW EXECUTE FUNCTION public.log_entity_activity();

DROP TRIGGER IF EXISTS trg_activity_network_devices ON public.network_devices;
CREATE TRIGGER trg_activity_network_devices AFTER INSERT OR UPDATE OR DELETE ON public.network_devices FOR EACH ROW EXECUTE FUNCTION public.log_entity_activity();

DROP TRIGGER IF EXISTS trg_activity_org_members ON public.organization_members;
CREATE TRIGGER trg_activity_org_members AFTER INSERT OR UPDATE OR DELETE ON public.organization_members FOR EACH ROW EXECUTE FUNCTION public.log_entity_activity();

DROP TRIGGER IF EXISTS trg_activity_org_invites ON public.organization_invites;
CREATE TRIGGER trg_activity_org_invites AFTER INSERT ON public.organization_invites FOR EACH ROW EXECUTE FUNCTION public.log_entity_activity();
