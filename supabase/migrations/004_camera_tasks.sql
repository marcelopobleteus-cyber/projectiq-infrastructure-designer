-- Create camera_tasks table
CREATE TABLE IF NOT EXISTS public.camera_tasks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    camera_id uuid REFERENCES public.camera_locations(id) ON DELETE CASCADE NOT NULL,
    project_task_id uuid REFERENCES public.field_tasks(id) ON DELETE SET NULL,
    template_key text, -- e.g. 'copper_verify_location'
    title text NOT NULL,
    task_type text NOT NULL, -- e.g. 'Cabling', 'Fiber'
    status text NOT NULL DEFAULT 'Not Started', -- 'Not Started', 'In Progress', 'Blocked', 'Complete', 'Failed QA', 'Needs Rework', 'Cancelled'
    priority text NOT NULL DEFAULT 'Medium', -- 'Low', 'Medium', 'High', 'Critical'
    assigned_to uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    due_date timestamp with time zone,
    completed_at timestamp with time zone,
    related_scope_item text,
    notes text,
    created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now()
);

-- Create uniqueness index for template checklist items per camera
CREATE UNIQUE INDEX IF NOT EXISTS camera_tasks_camera_id_template_key_idx 
ON public.camera_tasks (camera_id, template_key) 
WHERE template_key IS NOT NULL;

-- Create camera_task_history table
CREATE TABLE IF NOT EXISTS public.camera_task_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    camera_id uuid REFERENCES public.camera_locations(id) ON DELETE CASCADE NOT NULL,
    camera_task_id uuid REFERENCES public.camera_tasks(id) ON DELETE CASCADE NOT NULL,
    event_type text NOT NULL, -- 'created', 'status_changed', 'priority_changed', 'assigned_changed', 'due_date_changed', 'notes_changed', 'completed', 'reopened', 'failed_qa', 'needs_rework', 'template_generated'
    old_value text,
    new_value text,
    note text,
    created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- ── 1. Populating organization_id BEFORE INSERT ──
CREATE OR REPLACE FUNCTION public.set_camera_task_org_id()
RETURNS TRIGGER AS $$
BEGIN
    SELECT organization_id INTO NEW.organization_id
    FROM public.projects
    WHERE id = NEW.project_id;
    
    IF NEW.organization_id IS NULL THEN
        RAISE EXCEPTION 'Could not resolve organization_id for project_id %', NEW.project_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER tr_set_camera_task_org_id
BEFORE INSERT ON public.camera_tasks
FOR EACH ROW EXECUTE FUNCTION public.set_camera_task_org_id();


CREATE OR REPLACE FUNCTION public.set_camera_task_history_org_id()
RETURNS TRIGGER AS $$
BEGIN
    SELECT organization_id INTO NEW.organization_id
    FROM public.projects
    WHERE id = NEW.project_id;
    
    IF NEW.organization_id IS NULL THEN
        RAISE EXCEPTION 'Could not resolve organization_id for project_id %', NEW.project_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER tr_set_camera_history_org_id
BEFORE INSERT ON public.camera_task_history
FOR EACH ROW EXECUTE FUNCTION public.set_camera_task_history_org_id();


-- ── 2. Completed Date Defaults and updated_at ──
CREATE OR REPLACE FUNCTION public.set_camera_task_defaults()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := now();
    
    IF TG_OP = 'INSERT' THEN
        IF NEW.status = 'Complete' THEN
            NEW.completed_at := now();
        ELSE
            NEW.completed_at := NULL;
        END IF;
    ELSIF TG_OP = 'UPDATE' THEN
        IF NEW.status = 'Complete' THEN
            IF OLD.status IS DISTINCT FROM 'Complete' OR NEW.completed_at IS NULL THEN
                NEW.completed_at := now();
            END IF;
        ELSE
            NEW.completed_at := NULL;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER tr_set_camera_task_defaults
BEFORE INSERT OR UPDATE ON public.camera_tasks
FOR EACH ROW EXECUTE FUNCTION public.set_camera_task_defaults();


-- ── 3. Sychronization: camera_tasks -> field_tasks ──
CREATE OR REPLACE FUNCTION public.sync_camera_task_to_field_task()
RETURNS TRIGGER AS $$
DECLARE
    v_field_task_id uuid;
    v_task_status public.task_status;
    v_title text;
BEGIN
    IF pg_trigger_depth() > 1 THEN
        RETURN NEW;
    END IF;

    -- Strip any existing status prefixes (e.g. [Failed QA] or [Cancelled])
    v_title := regexp_replace(NEW.title, '^\[[^\]]+\]\s*', '');

    -- Map status and prepend prefix for advanced statuses
    IF NEW.status = 'Failed QA' THEN
        v_task_status := 'pending'::public.task_status;
        v_title := '[Failed QA] ' || v_title;
    ELSIF NEW.status = 'Needs Rework' THEN
        v_task_status := 'pending'::public.task_status;
        v_title := '[Needs Rework] ' || v_title;
    ELSIF NEW.status = 'Cancelled' THEN
        v_task_status := 'pending'::public.task_status;
        v_title := '[Cancelled] ' || v_title;
    ELSIF NEW.status = 'In Progress' THEN
        v_task_status := 'in_progress'::public.task_status;
    ELSIF NEW.status = 'Blocked' THEN
        v_task_status := 'blocked'::public.task_status;
    ELSIF NEW.status = 'Complete' THEN
        v_task_status := 'completed'::public.task_status;
    ELSE
        v_task_status := 'pending'::public.task_status;
    END IF;

    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.field_tasks (
            project_id,
            title,
            description,
            status,
            assigned_to,
            due_date
        ) VALUES (
            NEW.project_id,
            v_title,
            NEW.notes,
            v_task_status,
            NEW.assigned_to,
            NEW.due_date
        ) RETURNING id INTO v_field_task_id;

        -- Update project_task_id on original row
        UPDATE public.camera_tasks
        SET project_task_id = v_field_task_id
        WHERE id = NEW.id;

    ELSIF TG_OP = 'UPDATE' THEN
        IF (OLD.title IS DISTINCT FROM NEW.title) OR
           (OLD.notes IS DISTINCT FROM NEW.notes) OR
           (OLD.status IS DISTINCT FROM NEW.status) OR
           (OLD.assigned_to IS DISTINCT FROM NEW.assigned_to) OR
           (OLD.due_date IS DISTINCT FROM NEW.due_date) THEN

            IF NEW.project_task_id IS NOT NULL THEN
                UPDATE public.field_tasks
                SET
                    title = v_title,
                    description = NEW.notes,
                    status = v_task_status,
                    assigned_to = NEW.assigned_to,
                    due_date = NEW.due_date,
                    updated_at = now()
                WHERE id = NEW.project_task_id;
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER tr_sync_camera_task_to_field_task
AFTER INSERT OR UPDATE ON public.camera_tasks
FOR EACH ROW EXECUTE FUNCTION public.sync_camera_task_to_field_task();


-- ── 4. Delete Sync: camera_tasks -> field_tasks ──
CREATE OR REPLACE FUNCTION public.sync_camera_task_delete()
RETURNS TRIGGER AS $$
BEGIN
    IF pg_trigger_depth() > 1 THEN
        RETURN OLD;
    END IF;

    IF OLD.project_task_id IS NOT NULL THEN
        DELETE FROM public.field_tasks WHERE id = OLD.project_task_id;
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER tr_sync_camera_task_delete
AFTER DELETE ON public.camera_tasks
FOR EACH ROW EXECUTE FUNCTION public.sync_camera_task_delete();


-- ── 5. Sychronization: field_tasks -> camera_tasks ──
CREATE OR REPLACE FUNCTION public.sync_field_task_to_camera_task()
RETURNS TRIGGER AS $$
DECLARE
    v_cam_status text;
    v_clean_title text;
BEGIN
    IF pg_trigger_depth() > 1 THEN
        RETURN NEW;
    END IF;

    -- Strip prefixes to clean the base title
    v_clean_title := regexp_replace(NEW.title, '^\[[^\]]+\]\s*', '');

    -- Map status back, checking status enum first, then title prefixes for pending
    IF NEW.status = 'completed' THEN
        v_cam_status := 'Complete';
    ELSIF NEW.status = 'in_progress' THEN
        v_cam_status := 'In Progress';
    ELSIF NEW.status = 'blocked' THEN
        v_cam_status := 'Blocked';
    ELSE
        -- For pending status, check the title prefix to resolve advanced status
        IF NEW.title LIKE '[Failed QA]%' THEN
            v_cam_status := 'Failed QA';
        ELSIF NEW.title LIKE '[Needs Rework]%' THEN
            v_cam_status := 'Needs Rework';
        ELSIF NEW.title LIKE '[Cancelled]%' THEN
            v_cam_status := 'Cancelled';
        ELSE
            v_cam_status := 'Not Started';
        END IF;
    END IF;

    UPDATE public.camera_tasks
    SET
        title = v_clean_title,
        notes = NEW.description,
        status = v_cam_status,
        assigned_to = NEW.assigned_to,
        due_date = NEW.due_date,
        updated_at = now()
    WHERE project_task_id = NEW.id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER tr_sync_field_task_to_camera_task
AFTER UPDATE ON public.field_tasks
FOR EACH ROW EXECUTE FUNCTION public.sync_field_task_to_camera_task();


-- ── 6. Soft Delete Sync: field_tasks DELETE -> camera_tasks Cancelled ──
CREATE OR REPLACE FUNCTION public.sync_field_task_delete()
RETURNS TRIGGER AS $$
BEGIN
    IF pg_trigger_depth() > 1 THEN
        RETURN OLD;
    END IF;

    -- Mark linked camera tasks as Cancelled and break the foreign key link so delete succeeds
    UPDATE public.camera_tasks
    SET status = 'Cancelled',
        project_task_id = NULL,
        updated_at = now()
    WHERE project_task_id = OLD.id;

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER tr_sync_field_task_delete
BEFORE DELETE ON public.field_tasks
FOR EACH ROW EXECUTE FUNCTION public.sync_field_task_delete();


-- ── 7. History Auditing Trigger ──
CREATE OR REPLACE FUNCTION public.log_camera_task_history()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id uuid;
    v_event_type text;
    v_note text;
BEGIN
    -- Guard: If no audited columns changed (e.g. internal link updates), exit early
    IF TG_OP = 'UPDATE' THEN
        IF (OLD.status IS NOT DISTINCT FROM NEW.status) AND
           (OLD.priority IS NOT DISTINCT FROM NEW.priority) AND
           (OLD.assigned_to IS NOT DISTINCT FROM NEW.assigned_to) AND
           (OLD.due_date IS NOT DISTINCT FROM NEW.due_date) AND
           (OLD.notes IS NOT DISTINCT FROM NEW.notes) THEN
            RETURN NEW;
        END IF;
    END IF;

    v_user_id := auth.uid();

    IF TG_OP = 'INSERT' THEN
        IF NEW.template_key IS NOT NULL THEN
            v_event_type := 'template_generated';
            v_note := 'Task generated from template: ' || NEW.title;
        ELSE
            v_event_type := 'created';
            v_note := 'Task created: ' || NEW.title;
        END IF;

        INSERT INTO public.camera_task_history (
            project_id,
            camera_id,
            camera_task_id,
            event_type,
            new_value,
            note,
            created_by
        ) VALUES (
            NEW.project_id,
            NEW.camera_id,
            NEW.id,
            v_event_type,
            NEW.status,
            v_note,
            v_user_id
        );
    ELSIF TG_OP = 'UPDATE' THEN
        -- Status changed (handles Complete/Reopened/Needs Rework/Failed QA/Cancelled)
        IF OLD.status IS DISTINCT FROM NEW.status THEN
            IF NEW.status = 'Complete' THEN
                v_event_type := 'completed';
                v_note := 'Task marked as Complete';
            ELSIF OLD.status = 'Complete' AND NEW.status IS DISTINCT FROM 'Complete' THEN
                v_event_type := 'reopened';
                v_note := 'Task reopened (status changed from Complete to ' || NEW.status || ')';
            ELSIF NEW.status = 'Failed QA' THEN
                v_event_type := 'failed_qa';
                v_note := 'Task failed QA/QC';
            ELSIF NEW.status = 'Needs Rework' THEN
                v_event_type := 'needs_rework';
                v_note := 'Task marked for rework';
            ELSE
                v_event_type := 'status_changed';
                v_note := 'Status changed from ' || OLD.status || ' to ' || NEW.status;
            END IF;

            INSERT INTO public.camera_task_history (
                project_id,
                camera_id,
                camera_task_id,
                event_type,
                old_value,
                new_value,
                note,
                created_by
            ) VALUES (
                NEW.project_id,
                NEW.camera_id,
                NEW.id,
                v_event_type,
                OLD.status,
                NEW.status,
                v_note,
                v_user_id
            );
        END IF;

        -- Priority changed
        IF OLD.priority IS DISTINCT FROM NEW.priority THEN
            INSERT INTO public.camera_task_history (
                project_id,
                camera_id,
                camera_task_id,
                event_type,
                old_value,
                new_value,
                note,
                created_by
            ) VALUES (
                NEW.project_id,
                NEW.camera_id,
                NEW.id,
                'priority_changed',
                OLD.priority,
                NEW.priority,
                'Priority changed from ' || OLD.priority || ' to ' || NEW.priority,
                v_user_id
            );
        END IF;

        -- Assignee changed
        IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
            INSERT INTO public.camera_task_history (
                project_id,
                camera_id,
                camera_task_id,
                event_type,
                note,
                created_by
            ) VALUES (
                NEW.project_id,
                NEW.camera_id,
                NEW.id,
                'assigned_changed',
                'Assignee updated',
                v_user_id
            );
        END IF;

        -- Due date changed
        IF OLD.due_date IS DISTINCT FROM NEW.due_date THEN
            INSERT INTO public.camera_task_history (
                project_id,
                camera_id,
                camera_task_id,
                event_type,
                old_value,
                new_value,
                note,
                created_by
            ) VALUES (
                NEW.project_id,
                NEW.camera_id,
                NEW.id,
                'due_date_changed',
                coalesce(OLD.due_date::text, 'None'),
                coalesce(NEW.due_date::text, 'None'),
                'Due date changed to ' || coalesce(NEW.due_date::text, 'None'),
                v_user_id
            );
        END IF;

        -- Notes changed
        IF OLD.notes IS DISTINCT FROM NEW.notes THEN
            INSERT INTO public.camera_task_history (
                project_id,
                camera_id,
                camera_task_id,
                event_type,
                note,
                created_by
            ) VALUES (
                NEW.project_id,
                NEW.camera_id,
                NEW.id,
                'notes_changed',
                'Notes updated',
                v_user_id
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER tr_log_camera_task_history
AFTER INSERT OR UPDATE ON public.camera_tasks
FOR EACH ROW EXECUTE FUNCTION public.log_camera_task_history();


-- ── 8. Row Level Security Policies ──
ALTER TABLE public.camera_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.camera_task_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY all_camera_tasks ON public.camera_tasks FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.organization_members om
            WHERE om.organization_id = public.camera_tasks.organization_id
              AND om.profile_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.organization_members om
            WHERE om.organization_id = public.camera_tasks.organization_id
              AND om.profile_id = auth.uid()
        )
    );

CREATE POLICY all_camera_task_history ON public.camera_task_history FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.organization_members om
            WHERE om.organization_id = public.camera_task_history.organization_id
              AND om.profile_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.organization_members om
            WHERE om.organization_id = public.camera_task_history.organization_id
              AND om.profile_id = auth.uid()
        )
    );


-- ── 9. Interactive Kanban Board Title Prefix Cleaner ──
CREATE OR REPLACE FUNCTION public.clean_field_task_title_prefix()
RETURNS TRIGGER AS $$
BEGIN
    IF pg_trigger_depth() > 1 THEN
        RETURN NEW;
    END IF;

    -- If status is NOT pending, strip any status prefixes from the title
    IF NEW.status IS DISTINCT FROM 'pending'::public.task_status THEN
        NEW.title := regexp_replace(NEW.title, '^\[[^\]]+\]\s*', '');
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER tr_clean_field_task_title_prefix
BEFORE UPDATE ON public.field_tasks
FOR EACH ROW EXECUTE FUNCTION public.clean_field_task_title_prefix();
