-- Migration: 048_fix_activity_log_project_delete_fk.sql
-- Description: Fixes project deletion failing with
-- "insert or update on table activity_log violates foreign key constraint
-- activity_log_project_id_fkey".
--
-- Root cause: trg_activity_projects fires AFTER DELETE on public.projects and calls
-- log_entity_activity(), which inserts a row into activity_log with
-- project_id = OLD.id. By the time an AFTER DELETE trigger runs, the projects row
-- has already been removed, so that insert violates activity_log's FK to
-- projects(id) and aborts the whole deleteProject() transaction — the project's
-- child rows get deleted but the project row itself never does, and the UI shows
-- a generic "Error al eliminar" with no visible detail (buried behind the confirm
-- modal), which reads as "the delete button does nothing".
--
-- Fix: when logging a project DELETE, don't reference the now-deleted project id.
-- activity_log.project_id is nullable, so the org-level audit entry is kept but
-- points at organization_id only, same as it already does for entity types with
-- no project_id.

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
            -- Do NOT set v_project_id here: the project row is already gone by the
            -- time this AFTER DELETE trigger runs, so activity_log's FK to
            -- projects(id) would reject the insert. Leave it NULL and keep the
            -- project name in metadata instead.
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
