-- Migration: 005_fiber_network_foundation.sql
-- Upgrades fiber schemas to support 35-camera field installations, TIA-598 strand coloring, and organization triggers.

-- Drop foreign key constraints on bom_items and NULL out references before dropping fiber tables
ALTER TABLE public.bom_items DROP CONSTRAINT IF EXISTS bom_items_fiber_node_id_fkey;
ALTER TABLE public.bom_items DROP CONSTRAINT IF EXISTS bom_items_fiber_route_id_fkey;
-- NULL out any existing fiber references in bom_items so old FK data doesn't block re-add
UPDATE public.bom_items SET fiber_node_id = NULL WHERE fiber_node_id IS NOT NULL;
UPDATE public.bom_items SET fiber_route_id = NULL WHERE fiber_route_id IS NOT NULL;

-- Drop tables in cascade
DROP TABLE IF EXISTS public.camera_fiber_assignment_strands CASCADE;
DROP TABLE IF EXISTS public.camera_fiber_assignments CASCADE;
DROP TABLE IF EXISTS public.fiber_splices CASCADE; -- legacy splices table
DROP TABLE IF EXISTS public.fiber_splice_records CASCADE; -- new splices table
DROP TABLE IF EXISTS public.fiber_enclosures CASCADE;
DROP TABLE IF EXISTS public.fiber_strands CASCADE;
DROP TABLE IF EXISTS public.fiber_cables CASCADE;
DROP TABLE IF EXISTS public.fiber_route_segments CASCADE;
DROP TABLE IF EXISTS public.fiber_routes CASCADE;
DROP TABLE IF EXISTS public.fiber_nodes CASCADE;

-- 1. Create Fiber Nodes Table (using updated physical field names)
CREATE TABLE public.fiber_nodes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    node_tag text NOT NULL,
    node_type text NOT NULL CHECK (node_type IN ('Manhole', 'Handhole', 'Pull Box', 'Cabinet', 'Pole', 'Building', 'Existing Fiber Source', 'Camera Location', 'Custom')),
    latitude double precision NOT NULL CHECK (latitude >= -90.0 AND latitude <= 90.0),
    longitude double precision NOT NULL CHECK (longitude >= -180.0 AND longitude <= 180.0),
    address text,
    status text NOT NULL DEFAULT 'Planned' CHECK (status IN ('Planned', 'Existing', 'Installed', 'Blocked', 'Needs Survey', 'Removed')),
    elevation_ft numeric(6,2) DEFAULT 0.0 NOT NULL,
    structure_depth_ft numeric(5,2) DEFAULT 0.0 NOT NULL,
    size_description text DEFAULT '24x36x36' NOT NULL,
    slack_loop_ft numeric(6,2) DEFAULT 0.0 NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now(),
    UNIQUE (project_id, node_tag)
);

-- 2. Create Fiber Routes Table (Conduit runs/Pathways)
CREATE TABLE public.fiber_routes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    route_id_tag text NOT NULL,
    measured_length_feet numeric(8,2) NOT NULL DEFAULT 0.0,
    slack_percentage numeric(5,2) NOT NULL DEFAULT 10.0,
    installed_length_feet numeric(8,2) NOT NULL DEFAULT 0.0,
    conduit_diameter_inches numeric(4,2) NOT NULL DEFAULT 2.0,
    fill_percentage numeric(5,2) NOT NULL DEFAULT 0.0,
    spare_capacity numeric(5,2) NOT NULL DEFAULT 100.0,
    installation_type text NOT NULL DEFAULT 'underground' CHECK (installation_type IN ('underground', 'aerial', 'direct_buried')),
    route_purpose text NOT NULL DEFAULT 'camera_backbone' CHECK (route_purpose IN ('camera_backbone', 'camera_drop', 'network_backbone', 'power_monitoring', 'spare')),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now(),
    UNIQUE (project_id, route_id_tag)
);

-- 3. Create Fiber Route Segments Table (including project_id for RLS consistency)
CREATE TABLE public.fiber_route_segments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    route_id uuid REFERENCES public.fiber_routes(id) ON DELETE CASCADE NOT NULL,
    segment_index integer NOT NULL,
    start_latitude double precision NOT NULL,
    start_longitude double precision NOT NULL,
    end_latitude double precision NOT NULL,
    end_longitude double precision NOT NULL,
    length_feet numeric(8,2) NOT NULL DEFAULT 0.0,
    slack_feet numeric(6,2) NOT NULL DEFAULT 0.0,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now()
);

-- 4. Create Fiber Cables Table
CREATE TABLE public.fiber_cables (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    route_id uuid REFERENCES public.fiber_routes(id) ON DELETE SET NULL,
    cable_tag text NOT NULL,
    cable_type text NOT NULL CHECK (cable_type IN ('Backbone', 'Drop', 'Existing', 'Spare', 'Temporary', 'Custom')),
    fiber_count integer NOT NULL CHECK (fiber_count > 0),
    from_node_id uuid REFERENCES public.fiber_nodes(id) ON DELETE SET NULL,
    to_node_id uuid REFERENCES public.fiber_nodes(id) ON DELETE SET NULL,
    length_ft numeric(8,2) NOT NULL DEFAULT 0.0,
    install_status text NOT NULL DEFAULT 'Planned' CHECK (install_status IN ('Planned', 'Pulled', 'Installed', 'Blocked', 'Damaged', 'Removed')),
    test_status text NOT NULL DEFAULT 'Not Tested' CHECK (test_status IN ('Not Tested', 'Passed', 'Failed', 'Needs Retest')),
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now(),
    UNIQUE (project_id, cable_tag)
);

-- 5. Create Fiber Strands Table
CREATE TABLE public.fiber_strands (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    cable_id uuid REFERENCES public.fiber_cables(id) ON DELETE CASCADE NOT NULL,
    strand_number integer NOT NULL,
    tube_color text NOT NULL,
    fiber_color text NOT NULL,
    assigned_camera_id uuid REFERENCES public.camera_locations(id) ON DELETE SET NULL,
    assigned_purpose text,
    splice_status text NOT NULL DEFAULT 'Not Spliced' CHECK (splice_status IN ('Not Spliced', 'Spliced', 'Failed', 'Needs Rework')),
    test_status text NOT NULL DEFAULT 'Not Tested' CHECK (test_status IN ('Not Tested', 'Passed', 'Failed', 'Needs Retest')),
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now(),
    UNIQUE (cable_id, strand_number)
);

-- 6. Create Fiber Enclosures Table
CREATE TABLE public.fiber_enclosures (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    enclosure_tag text NOT NULL,
    node_id uuid REFERENCES public.fiber_nodes(id) ON DELETE CASCADE NOT NULL,
    enclosure_type text NOT NULL CHECK (enclosure_type IN ('Splice Enclosure', 'Patch Panel', 'Cabinet Enclosure', 'Wall Mount', 'Underground Closure', 'Custom')),
    capacity integer NOT NULL DEFAULT 12,
    installed_status text NOT NULL DEFAULT 'Planned' CHECK (installed_status IN ('Planned', 'Existing', 'Installed', 'Blocked', 'Needs Survey', 'Removed')),
    splice_count integer NOT NULL DEFAULT 0,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now(),
    UNIQUE (project_id, enclosure_tag)
);

-- 7. Create Fiber Splice Records Table
CREATE TABLE public.fiber_splice_records (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    enclosure_id uuid REFERENCES public.fiber_enclosures(id) ON DELETE CASCADE NOT NULL,
    from_cable_id uuid REFERENCES public.fiber_cables(id) ON DELETE CASCADE NOT NULL,
    from_strand_id uuid REFERENCES public.fiber_strands(id) ON DELETE CASCADE NOT NULL,
    to_cable_id uuid REFERENCES public.fiber_cables(id) ON DELETE CASCADE NOT NULL,
    to_strand_id uuid REFERENCES public.fiber_strands(id) ON DELETE CASCADE NOT NULL,
    assigned_camera_id uuid REFERENCES public.camera_locations(id) ON DELETE SET NULL,
    splice_status text NOT NULL DEFAULT 'Not Spliced' CHECK (splice_status IN ('Not Spliced', 'Spliced', 'Failed', 'Needs Rework')),
    completed_by uuid,
    completed_at timestamp with time zone,
    test_status text NOT NULL DEFAULT 'Not Tested' CHECK (test_status IN ('Not Tested', 'Passed', 'Failed', 'Needs Retest')),
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now(),
    UNIQUE (enclosure_id, from_cable_id, from_strand_id),
    UNIQUE (enclosure_id, to_cable_id, to_strand_id)
);

-- 8. Create Camera Fiber Assignments Table (normalized)
CREATE TABLE public.camera_fiber_assignments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    camera_id uuid REFERENCES public.camera_locations(id) ON DELETE CASCADE NOT NULL,
    source_node_id uuid REFERENCES public.fiber_nodes(id) ON DELETE SET NULL,
    enclosure_id uuid REFERENCES public.fiber_enclosures(id) ON DELETE SET NULL,
    backbone_cable_id uuid REFERENCES public.fiber_cables(id) ON DELETE SET NULL,
    drop_cable_id uuid REFERENCES public.fiber_cables(id) ON DELETE SET NULL,
    splice_status text NOT NULL DEFAULT 'Not Spliced' CHECK (splice_status IN ('Not Spliced', 'Spliced', 'Failed', 'Needs Rework')),
    test_status text NOT NULL DEFAULT 'Not Tested' CHECK (test_status IN ('Not Tested', 'Passed', 'Failed', 'Needs Retest')),
    fiber_path_status text NOT NULL DEFAULT 'Planned' CHECK (fiber_path_status IN ('Planned', 'Fiber Pulled', 'Splicing Pending', 'Spliced', 'Testing Pending', 'Tested', 'Connected', 'Complete', 'Blocked')),
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now(),
    UNIQUE (camera_id)
);

-- 9. Create Camera Fiber Assignment Strands Join Table (for accurate reporting/testing/splicing)
CREATE TABLE public.camera_fiber_assignment_strands (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    camera_fiber_assignment_id uuid REFERENCES public.camera_fiber_assignments(id) ON DELETE CASCADE NOT NULL,
    camera_id uuid REFERENCES public.camera_locations(id) ON DELETE CASCADE NOT NULL,
    strand_id uuid REFERENCES public.fiber_strands(id) ON DELETE CASCADE NOT NULL,
    strand_role text NOT NULL CHECK (strand_role IN ('TX', 'RX', 'Spare', 'Data', 'Custom')),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now(),
    UNIQUE (camera_fiber_assignment_id, strand_id),
    UNIQUE (strand_id) -- enforcing each strand can only be assigned to one camera assignment
);

-- 10. Reconnect constraints to bom_items (ON DELETE SET NULL to protect BOM line items)
ALTER TABLE public.bom_items
ADD CONSTRAINT bom_items_fiber_node_id_fkey FOREIGN KEY (fiber_node_id) REFERENCES public.fiber_nodes(id) ON DELETE SET NULL,
ADD CONSTRAINT bom_items_fiber_route_id_fkey FOREIGN KEY (fiber_route_id) REFERENCES public.fiber_routes(id) ON DELETE SET NULL;

-- 11. Create organization_id helper function and triggers
CREATE OR REPLACE FUNCTION public.set_fiber_organization_id_from_project()
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

CREATE TRIGGER tr_set_fiber_node_org_id BEFORE INSERT ON public.fiber_nodes FOR EACH ROW EXECUTE FUNCTION public.set_fiber_organization_id_from_project();
CREATE TRIGGER tr_set_fiber_route_org_id BEFORE INSERT ON public.fiber_routes FOR EACH ROW EXECUTE FUNCTION public.set_fiber_organization_id_from_project();
CREATE TRIGGER tr_set_fiber_route_segment_org_id BEFORE INSERT ON public.fiber_route_segments FOR EACH ROW EXECUTE FUNCTION public.set_fiber_organization_id_from_project();
CREATE TRIGGER tr_set_fiber_cable_org_id BEFORE INSERT ON public.fiber_cables FOR EACH ROW EXECUTE FUNCTION public.set_fiber_organization_id_from_project();
CREATE TRIGGER tr_set_fiber_strand_org_id BEFORE INSERT ON public.fiber_strands FOR EACH ROW EXECUTE FUNCTION public.set_fiber_organization_id_from_project();
CREATE TRIGGER tr_set_fiber_enclosure_org_id BEFORE INSERT ON public.fiber_enclosures FOR EACH ROW EXECUTE FUNCTION public.set_fiber_organization_id_from_project();
CREATE TRIGGER tr_set_fiber_splice_record_org_id BEFORE INSERT ON public.fiber_splice_records FOR EACH ROW EXECUTE FUNCTION public.set_fiber_organization_id_from_project();
CREATE TRIGGER tr_set_camera_fiber_assignment_org_id BEFORE INSERT ON public.camera_fiber_assignments FOR EACH ROW EXECUTE FUNCTION public.set_fiber_organization_id_from_project();
CREATE TRIGGER tr_set_camera_fiber_assignment_strand_org_id BEFORE INSERT ON public.camera_fiber_assignment_strands FOR EACH ROW EXECUTE FUNCTION public.set_fiber_organization_id_from_project();

-- 12. Create auto strand generator trigger on fiber_cables
CREATE OR REPLACE FUNCTION public.auto_generate_fiber_strands()
RETURNS TRIGGER AS $$
DECLARE
    v_strand_number integer;
    v_tube_number integer;
    v_tube_color text;
    v_fiber_color text;
    v_colors text[] := ARRAY['Blue', 'Orange', 'Green', 'Brown', 'Slate', 'White', 'Red', 'Black', 'Yellow', 'Violet', 'Rose', 'Aqua'];
BEGIN
    FOR v_strand_number IN 1..NEW.fiber_count LOOP
        -- Calculate tube index and fiber index (1-based)
        v_tube_number := ((v_strand_number - 1) / 12) + 1;
        v_tube_color := v_colors[((v_tube_number - 1) % 12) + 1];
        v_fiber_color := v_colors[((v_strand_number - 1) % 12) + 1];
        
        INSERT INTO public.fiber_strands (
            project_id,
            cable_id,
            strand_number,
            tube_color,
            fiber_color,
            splice_status,
            test_status
        ) VALUES (
            NEW.project_id,
            NEW.id,
            v_strand_number,
            v_tube_color,
            v_fiber_color,
            'Not Spliced',
            'Not Tested'
        );
    END LOOP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_auto_generate_fiber_strands
AFTER INSERT ON public.fiber_cables
FOR EACH ROW EXECUTE FUNCTION public.auto_generate_fiber_strands();

-- 13. Create trigger to automatically maintain splice count inside enclosures
CREATE OR REPLACE FUNCTION public.sync_splice_count_in_enclosure()
RETURNS TRIGGER AS $$
DECLARE
    v_enclosure_id uuid;
    v_count integer;
BEGIN
    IF TG_OP = 'DELETE' THEN
        v_enclosure_id := OLD.enclosure_id;
    ELSE
        v_enclosure_id := NEW.enclosure_id;
    END IF;

    SELECT COUNT(*) INTO v_count
    FROM public.fiber_splice_records
    WHERE enclosure_id = v_enclosure_id;

    UPDATE public.fiber_enclosures
    SET splice_count = v_count
    WHERE id = v_enclosure_id;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_sync_splice_count_in_enclosure
AFTER INSERT OR UPDATE OR DELETE ON public.fiber_splice_records
FOR EACH ROW EXECUTE FUNCTION public.sync_splice_count_in_enclosure();

-- 14. Task-to-Fiber-Status Sync Trigger
CREATE OR REPLACE FUNCTION public.sync_camera_task_to_fiber_status()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.template_key = 'fiber_test_fiber' OR NEW.template_key = 'fiber_test' THEN
        IF NEW.status = 'Complete' THEN
            UPDATE public.camera_fiber_assignments
            SET test_status = 'Passed',
                fiber_path_status = 'Tested',
                updated_at = now()
            WHERE camera_id = NEW.camera_id;
        ELSIF NEW.status = 'Blocked' THEN
            UPDATE public.camera_fiber_assignments
            SET test_status = 'Failed',
                fiber_path_status = 'Blocked',
                updated_at = now()
            WHERE camera_id = NEW.camera_id;
        ELSIF NEW.status = 'Failed QA' OR NEW.status = 'Needs Rework' THEN
            UPDATE public.camera_fiber_assignments
            SET test_status = 'Needs Retest',
                fiber_path_status = 'Testing Pending',
                updated_at = now()
            WHERE camera_id = NEW.camera_id;
        ELSE
            UPDATE public.camera_fiber_assignments
            SET test_status = 'Not Tested',
                fiber_path_status = 'Testing Pending',
                updated_at = now()
            WHERE camera_id = NEW.camera_id;
        END IF;
    ELSIF NEW.template_key = 'fiber_splice_fiber' OR NEW.template_key = 'fiber_splice' THEN
        IF NEW.status = 'Complete' THEN
            UPDATE public.camera_fiber_assignments
            SET splice_status = 'Spliced',
                fiber_path_status = 'Spliced',
                updated_at = now()
            WHERE camera_id = NEW.camera_id;
        ELSIF NEW.status = 'Blocked' THEN
            UPDATE public.camera_fiber_assignments
            SET splice_status = 'Failed',
                fiber_path_status = 'Blocked',
                updated_at = now()
            WHERE camera_id = NEW.camera_id;
        ELSE
            UPDATE public.camera_fiber_assignments
            SET splice_status = 'Not Spliced',
                fiber_path_status = 'Splicing Pending',
                updated_at = now()
            WHERE camera_id = NEW.camera_id;
        END IF;
    ELSIF NEW.template_key = 'fiber_pull_drop' THEN
        IF NEW.status = 'Complete' THEN
            UPDATE public.camera_fiber_assignments
            SET fiber_path_status = 'Fiber Pulled',
                updated_at = now()
            WHERE camera_id = NEW.camera_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER tr_sync_camera_task_to_fiber_status
AFTER INSERT OR UPDATE ON public.camera_tasks
FOR EACH ROW EXECUTE FUNCTION public.sync_camera_task_to_fiber_status();

-- 15. Enable Row Level Security (RLS) on all tables explicitly
ALTER TABLE public.fiber_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fiber_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fiber_route_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fiber_cables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fiber_strands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fiber_enclosures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fiber_splice_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.camera_fiber_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.camera_fiber_assignment_strands ENABLE ROW LEVEL SECURITY;

-- 16. Create RLS Policies using organization_id matching
CREATE POLICY select_fiber_nodes ON public.fiber_nodes FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.organization_members om WHERE om.organization_id = public.fiber_nodes.organization_id AND om.profile_id = auth.uid())
);
CREATE POLICY insert_fiber_nodes ON public.fiber_nodes FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.organization_members om WHERE om.organization_id = public.fiber_nodes.organization_id AND om.profile_id = auth.uid())
);
CREATE POLICY update_fiber_nodes ON public.fiber_nodes FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.organization_members om WHERE om.organization_id = public.fiber_nodes.organization_id AND om.profile_id = auth.uid())
) WITH CHECK (
    EXISTS (SELECT 1 FROM public.organization_members om WHERE om.organization_id = public.fiber_nodes.organization_id AND om.profile_id = auth.uid())
);
CREATE POLICY delete_fiber_nodes ON public.fiber_nodes FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.organization_members om WHERE om.organization_id = public.fiber_nodes.organization_id AND om.profile_id = auth.uid())
);

-- fiber_routes policies
CREATE POLICY select_fiber_routes ON public.fiber_routes FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.organization_members om WHERE om.organization_id = public.fiber_routes.organization_id AND om.profile_id = auth.uid())
);
CREATE POLICY insert_fiber_routes ON public.fiber_routes FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.organization_members om WHERE om.organization_id = public.fiber_routes.organization_id AND om.profile_id = auth.uid())
);
CREATE POLICY update_fiber_routes ON public.fiber_routes FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.organization_members om WHERE om.organization_id = public.fiber_routes.organization_id AND om.profile_id = auth.uid())
) WITH CHECK (
    EXISTS (SELECT 1 FROM public.organization_members om WHERE om.organization_id = public.fiber_routes.organization_id AND om.profile_id = auth.uid())
);
CREATE POLICY delete_fiber_routes ON public.fiber_routes FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.organization_members om WHERE om.organization_id = public.fiber_routes.organization_id AND om.profile_id = auth.uid())
);

-- fiber_route_segments policies
CREATE POLICY select_fiber_route_segments ON public.fiber_route_segments FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.organization_members om WHERE om.organization_id = public.fiber_route_segments.organization_id AND om.profile_id = auth.uid())
);
CREATE POLICY insert_fiber_route_segments ON public.fiber_route_segments FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.organization_members om WHERE om.organization_id = public.fiber_route_segments.organization_id AND om.profile_id = auth.uid())
);
CREATE POLICY update_fiber_route_segments ON public.fiber_route_segments FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.organization_members om WHERE om.organization_id = public.fiber_route_segments.organization_id AND om.profile_id = auth.uid())
) WITH CHECK (
    EXISTS (SELECT 1 FROM public.organization_members om WHERE om.organization_id = public.fiber_route_segments.organization_id AND om.profile_id = auth.uid())
);
CREATE POLICY delete_fiber_route_segments ON public.fiber_route_segments FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.organization_members om WHERE om.organization_id = public.fiber_route_segments.organization_id AND om.profile_id = auth.uid())
);

-- fiber_cables policies
CREATE POLICY select_fiber_cables ON public.fiber_cables FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.organization_members om WHERE om.organization_id = public.fiber_cables.organization_id AND om.profile_id = auth.uid())
);
CREATE POLICY insert_fiber_cables ON public.fiber_cables FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.organization_members om WHERE om.organization_id = public.fiber_cables.organization_id AND om.profile_id = auth.uid())
);
CREATE POLICY update_fiber_cables ON public.fiber_cables FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.organization_members om WHERE om.organization_id = public.fiber_cables.organization_id AND om.profile_id = auth.uid())
) WITH CHECK (
    EXISTS (SELECT 1 FROM public.organization_members om WHERE om.organization_id = public.fiber_cables.organization_id AND om.profile_id = auth.uid())
);
CREATE POLICY delete_fiber_cables ON public.fiber_cables FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.organization_members om WHERE om.organization_id = public.fiber_cables.organization_id AND om.profile_id = auth.uid())
);

-- fiber_strands policies
CREATE POLICY select_fiber_strands ON public.fiber_strands FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.organization_members om WHERE om.organization_id = public.fiber_strands.organization_id AND om.profile_id = auth.uid())
);
CREATE POLICY insert_fiber_strands ON public.fiber_strands FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.organization_members om WHERE om.organization_id = public.fiber_strands.organization_id AND om.profile_id = auth.uid())
);
CREATE POLICY update_fiber_strands ON public.fiber_strands FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.organization_members om WHERE om.organization_id = public.fiber_strands.organization_id AND om.profile_id = auth.uid())
) WITH CHECK (
    EXISTS (SELECT 1 FROM public.organization_members om WHERE om.organization_id = public.fiber_strands.organization_id AND om.profile_id = auth.uid())
);
CREATE POLICY delete_fiber_strands ON public.fiber_strands FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.organization_members om WHERE om.organization_id = public.fiber_strands.organization_id AND om.profile_id = auth.uid())
);

-- fiber_enclosures policies
CREATE POLICY select_fiber_enclosures ON public.fiber_enclosures FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.organization_members om WHERE om.organization_id = public.fiber_enclosures.organization_id AND om.profile_id = auth.uid())
);
CREATE POLICY insert_fiber_enclosures ON public.fiber_enclosures FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.organization_members om WHERE om.organization_id = public.fiber_enclosures.organization_id AND om.profile_id = auth.uid())
);
CREATE POLICY update_fiber_enclosures ON public.fiber_enclosures FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.organization_members om WHERE om.organization_id = public.fiber_enclosures.organization_id AND om.profile_id = auth.uid())
) WITH CHECK (
    EXISTS (SELECT 1 FROM public.organization_members om WHERE om.organization_id = public.fiber_enclosures.organization_id AND om.profile_id = auth.uid())
);
CREATE POLICY delete_fiber_enclosures ON public.fiber_enclosures FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.organization_members om WHERE om.organization_id = public.fiber_enclosures.organization_id AND om.profile_id = auth.uid())
);

-- fiber_splice_records policies
CREATE POLICY select_fiber_splice_records ON public.fiber_splice_records FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.organization_members om WHERE om.organization_id = public.fiber_splice_records.organization_id AND om.profile_id = auth.uid())
);
CREATE POLICY insert_fiber_splice_records ON public.fiber_splice_records FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.organization_members om WHERE om.organization_id = public.fiber_splice_records.organization_id AND om.profile_id = auth.uid())
);
CREATE POLICY update_fiber_splice_records ON public.fiber_splice_records FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.organization_members om WHERE om.organization_id = public.fiber_splice_records.organization_id AND om.profile_id = auth.uid())
) WITH CHECK (
    EXISTS (SELECT 1 FROM public.organization_members om WHERE om.organization_id = public.fiber_splice_records.organization_id AND om.profile_id = auth.uid())
);
CREATE POLICY delete_fiber_splice_records ON public.fiber_splice_records FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.organization_members om WHERE om.organization_id = public.fiber_splice_records.organization_id AND om.profile_id = auth.uid())
);

-- camera_fiber_assignments policies
CREATE POLICY select_camera_fiber_assignments ON public.camera_fiber_assignments FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.organization_members om WHERE om.organization_id = public.camera_fiber_assignments.organization_id AND om.profile_id = auth.uid())
);
CREATE POLICY insert_camera_fiber_assignments ON public.camera_fiber_assignments FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.organization_members om WHERE om.organization_id = public.camera_fiber_assignments.organization_id AND om.profile_id = auth.uid())
);
CREATE POLICY update_camera_fiber_assignments ON public.camera_fiber_assignments FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.organization_members om WHERE om.organization_id = public.camera_fiber_assignments.organization_id AND om.profile_id = auth.uid())
) WITH CHECK (
    EXISTS (SELECT 1 FROM public.organization_members om WHERE om.organization_id = public.camera_fiber_assignments.organization_id AND om.profile_id = auth.uid())
);
CREATE POLICY delete_camera_fiber_assignments ON public.camera_fiber_assignments FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.organization_members om WHERE om.organization_id = public.camera_fiber_assignments.organization_id AND om.profile_id = auth.uid())
);

-- camera_fiber_assignment_strands policies
CREATE POLICY select_camera_fiber_assignment_strands ON public.camera_fiber_assignment_strands FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.organization_members om WHERE om.organization_id = public.camera_fiber_assignment_strands.organization_id AND om.profile_id = auth.uid())
);
CREATE POLICY insert_camera_fiber_assignment_strands ON public.camera_fiber_assignment_strands FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.organization_members om WHERE om.organization_id = public.camera_fiber_assignment_strands.organization_id AND om.profile_id = auth.uid())
);
CREATE POLICY update_camera_fiber_assignment_strands ON public.camera_fiber_assignment_strands FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.organization_members om WHERE om.organization_id = public.camera_fiber_assignment_strands.organization_id AND om.profile_id = auth.uid())
) WITH CHECK (
    EXISTS (SELECT 1 FROM public.organization_members om WHERE om.organization_id = public.camera_fiber_assignment_strands.organization_id AND om.profile_id = auth.uid())
);
CREATE POLICY delete_camera_fiber_assignment_strands ON public.camera_fiber_assignment_strands FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.organization_members om WHERE om.organization_id = public.camera_fiber_assignment_strands.organization_id AND om.profile_id = auth.uid())
);

-- 17. Migrate and restore seed mock records to new formats
DO $$
DECLARE
    v_project_id uuid := 'c71f1704-a01b-4661-a079-55e5b66f166d';
    v_org_id uuid;
    v_catalog_id uuid := 'e571009a-9400-4e92-a35c-2c9674f3f20e';
    v_camera_id uuid := '06c1ce91-90fc-48a5-bade-a6f69e0456d5';
BEGIN
    -- Check if project and org exist
    SELECT organization_id INTO v_org_id FROM public.projects WHERE id = v_project_id;
    
    IF v_org_id IS NOT NULL THEN
        -- 1. Insert Node SE-001 (Cabinet)
        INSERT INTO public.fiber_nodes (
            id, organization_id, project_id, node_tag, node_type, latitude, longitude, elevation_ft, structure_depth_ft, size_description, slack_loop_ft, status, notes
        ) VALUES (
            '11111111-1111-1111-1111-111111111111', v_org_id, v_project_id, 'SE-001', 'Cabinet', 33.749, -84.388, 34.45, 6.00, 'Dome Closure', 20.00, 'Installed', 'Main distribution vault'
        ) ON CONFLICT DO NOTHING;

        -- 2. Insert Enclosure ENC-SE-001 (Splice Enclosure)
        INSERT INTO public.fiber_enclosures (
            id, organization_id, project_id, enclosure_tag, node_id, enclosure_type, capacity, installed_status, splice_count, notes
        ) VALUES (
            '11111111-1111-1111-1111-111111111112', v_org_id, v_project_id, 'ENC-SE-001', '11111111-1111-1111-1111-111111111111', 'Splice Enclosure', 24, 'Installed', 0, 'Initial Dome Splice Case'
        ) ON CONFLICT DO NOTHING;

        -- 3. Insert Route R-001
        INSERT INTO public.fiber_routes (
            id, organization_id, project_id, route_id_tag, measured_length_feet, slack_percentage, installed_length_feet, conduit_diameter_inches, fill_percentage, spare_capacity, installation_type, route_purpose
        ) VALUES (
            '22222222-2222-2222-2222-222222222222', v_org_id, v_project_id, 'R-001', 150.00, 10.00, 165.00, 2.00, 8.50, 91.50, 'underground', 'camera_backbone'
        ) ON CONFLICT DO NOTHING;

        -- 4. Insert Route Segment
        INSERT INTO public.fiber_route_segments (
            id, organization_id, project_id, route_id, segment_index, start_latitude, start_longitude, end_latitude, end_longitude, length_feet, slack_feet
        ) VALUES (
            '33333333-3333-3333-3333-333333333333', v_org_id, v_project_id, '22222222-2222-2222-2222-222222222222', 0, 33.749, -84.388, 33.7493, -84.3885, 150.00, 0.00
        ) ON CONFLICT DO NOTHING;

        -- 5. Insert Backbone Cable BB-R-001 (6F, Backbone) on Route R-001
        INSERT INTO public.fiber_cables (
            id, organization_id, project_id, route_id, cable_tag, cable_type, fiber_count, from_node_id, to_node_id, length_ft, install_status, test_status
        ) VALUES (
            '44444444-4444-4444-4444-444444444444', v_org_id, v_project_id, '22222222-2222-2222-2222-222222222222', 'BB-R-001', 'Backbone', 6, '11111111-1111-1111-1111-111111111111', NULL, 165.00, 'Installed', 'Passed'
        ) ON CONFLICT DO NOTHING;

        -- 6. Insert Camera Location Node NODE-CAM-06c1 at camera coordinates
        INSERT INTO public.fiber_nodes (
            id, organization_id, project_id, node_tag, node_type, latitude, longitude, elevation_ft, structure_depth_ft, size_description, slack_loop_ft, status, notes
        ) VALUES (
            '11111111-1111-1111-1111-111111111113', v_org_id, v_project_id, 'NODE-CAM-06c1', 'Camera Location', 33.749, -84.388, 0.00, 0.00, 'Pole Mount Transition', 10.00, 'Installed', 'Camera location junction box'
        ) ON CONFLICT DO NOTHING;

        -- 7. Insert Drop Cable DROP-CAM-06c1-6F running from SE-001 to NODE-CAM-06c1
        INSERT INTO public.fiber_cables (
            id, organization_id, project_id, route_id, cable_tag, cable_type, fiber_count, from_node_id, to_node_id, length_ft, install_status, test_status
        ) VALUES (
            '44444444-4444-4444-4444-444444444445', v_org_id, v_project_id, NULL, 'DROP-CAM-06c1-6F', 'Drop', 6, '11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111113', 125.00, 'Installed', 'Passed'
        ) ON CONFLICT DO NOTHING;

        -- Link the first two strands to the camera fiber assignment
        DECLARE
            v_bb_strand1_id uuid;
            v_bb_strand2_id uuid;
            v_drop_strand1_id uuid;
            v_drop_strand2_id uuid;
            v_assignment_id uuid := '88888888-8888-8888-8888-888888888888';
        BEGIN
            -- Find strands of Backbone Cable
            SELECT id INTO v_bb_strand1_id FROM public.fiber_strands WHERE cable_id = '44444444-4444-4444-4444-444444444444' AND strand_number = 1;
            SELECT id INTO v_bb_strand2_id FROM public.fiber_strands WHERE cable_id = '44444444-4444-4444-4444-444444444444' AND strand_number = 2;

            -- Find strands of Drop Cable
            SELECT id INTO v_drop_strand1_id FROM public.fiber_strands WHERE cable_id = '44444444-4444-4444-4444-444444444445' AND strand_number = 1;
            SELECT id INTO v_drop_strand2_id FROM public.fiber_strands WHERE cable_id = '44444444-4444-4444-4444-444444444445' AND strand_number = 2;

            -- Insert Camera Assignment first (mapping backbone AND drop cable)
            INSERT INTO public.camera_fiber_assignments (
                id, organization_id, project_id, camera_id, source_node_id, enclosure_id, drop_cable_id, backbone_cable_id, splice_status, test_status, fiber_path_status
            ) VALUES (
                v_assignment_id, v_org_id, v_project_id, v_camera_id, '11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111112', '44444444-4444-4444-4444-444444444445', '44444444-4444-4444-4444-444444444444', 'Spliced', 'Passed', 'Complete'
            ) ON CONFLICT DO NOTHING;

            IF v_bb_strand1_id IS NOT NULL AND v_drop_strand1_id IS NOT NULL THEN
                -- Create Splice Record connecting Backbone Core 1 to Drop Core 1 in Cabinet Enclosure
                INSERT INTO public.fiber_splice_records (
                    organization_id, project_id, enclosure_id, from_cable_id, from_strand_id, to_cable_id, to_strand_id, splice_status, test_status
                ) VALUES (
                    v_org_id, v_project_id, '11111111-1111-1111-1111-111111111112', '44444444-4444-4444-4444-444444444444', v_bb_strand1_id, '44444444-4444-4444-4444-444444444445', v_drop_strand1_id, 'Spliced', 'Passed'
                ) ON CONFLICT DO NOTHING;
            END IF;

            IF v_bb_strand2_id IS NOT NULL AND v_drop_strand2_id IS NOT NULL THEN
                -- Create Splice Record connecting Backbone Core 2 to Drop Core 2 in Cabinet Enclosure
                INSERT INTO public.fiber_splice_records (
                    organization_id, project_id, enclosure_id, from_cable_id, from_strand_id, to_cable_id, to_strand_id, splice_status, test_status
                ) VALUES (
                    v_org_id, v_project_id, '11111111-1111-1111-1111-111111111112', '44444444-4444-4444-4444-444444444444', v_bb_strand2_id, '44444444-4444-4444-4444-444444444445', v_drop_strand2_id, 'Spliced', 'Passed'
                ) ON CONFLICT DO NOTHING;
            END IF;

            -- Update strand assignments (dual-indexing to Drop strands)
            IF v_drop_strand1_id IS NOT NULL AND v_drop_strand2_id IS NOT NULL THEN
                UPDATE public.fiber_strands SET assigned_camera_id = v_camera_id, splice_status = 'Spliced', test_status = 'Passed' WHERE id IN (v_drop_strand1_id, v_drop_strand2_id);

                -- Insert assignment strands join links (duplex TX/RX strands of Drop Cable)
                INSERT INTO public.camera_fiber_assignment_strands (
                    organization_id, project_id, camera_fiber_assignment_id, camera_id, strand_id, strand_role
                ) VALUES 
                (v_org_id, v_project_id, v_assignment_id, v_camera_id, v_drop_strand1_id, 'TX'),
                (v_org_id, v_project_id, v_assignment_id, v_camera_id, v_drop_strand2_id, 'RX')
                ON CONFLICT DO NOTHING;
            END IF;
        END;
    END IF;
END $$;
