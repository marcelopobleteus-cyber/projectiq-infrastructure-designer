-- Migration: 007_fiber_splicing_matrix.sql
-- Description: Upgrades fiber tables to support Splicing Matrix, Buffer Tubes, Splice Trays, and Generalized Strand Assignments.

-- 1. Extend check constraints on existing fiber_cables
ALTER TABLE public.fiber_cables DROP CONSTRAINT IF EXISTS fiber_cables_cable_type_check;
ALTER TABLE public.fiber_cables ADD CONSTRAINT fiber_cables_cable_type_check 
    CHECK (cable_type IN ('Backbone', 'Distribution', 'Drop', 'Existing', 'Future', 'Spare', 'Temporary', 'Custom'));

-- Add missing columns to fiber_cables
ALTER TABLE public.fiber_cables 
ADD COLUMN IF NOT EXISTS manufacturer text,
ADD COLUMN IF NOT EXISTS model text;

-- Add backward-compatible generated columns to fiber_cables for UI schemas
ALTER TABLE public.fiber_cables ADD COLUMN IF NOT EXISTS strand_count integer GENERATED ALWAYS AS (fiber_count) STORED;
ALTER TABLE public.fiber_cables ADD COLUMN IF NOT EXISTS status text GENERATED ALWAYS AS (install_status) STORED;

-- 2. Create Fiber Buffer Tubes Table
CREATE TABLE IF NOT EXISTS public.fiber_buffer_tubes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    cable_id uuid REFERENCES public.fiber_cables(id) ON DELETE CASCADE NOT NULL,
    tube_number integer NOT NULL CHECK (tube_number > 0),
    tube_color text NOT NULL,
    strand_start integer NOT NULL CHECK (strand_start > 0),
    strand_end integer NOT NULL CHECK (strand_end > 0),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now(),
    UNIQUE (cable_id, tube_number),
    CONSTRAINT strand_range_check CHECK (strand_start <= strand_end)
);

-- 3. Create Cable Pass-Throughs Table (Non-Segmented Routes)
CREATE TABLE IF NOT EXISTS public.fiber_cable_pass_throughs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    cable_id uuid REFERENCES public.fiber_cables(id) ON DELETE CASCADE NOT NULL,
    node_id uuid REFERENCES public.fiber_nodes(id) ON DELETE CASCADE NOT NULL,
    sequence_order integer NOT NULL CHECK (sequence_order >= 0),
    has_slack_loop boolean DEFAULT false NOT NULL,
    slack_length_ft numeric(6,2) DEFAULT 0.00 NOT NULL CHECK (slack_length_ft >= 0.00),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now(),
    UNIQUE (cable_id, node_id)
);

-- 4. Extend Fiber Strands table
ALTER TABLE public.fiber_strands 
ADD COLUMN IF NOT EXISTS buffer_tube_id uuid REFERENCES public.fiber_buffer_tubes(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS status text DEFAULT 'Available' NOT NULL 
    CHECK (status IN ('Available', 'Assigned', 'Spliced', 'Reserved', 'Damaged', 'Retired'));

-- Add compatibility generated column for strand color mapping
ALTER TABLE public.fiber_strands ADD COLUMN IF NOT EXISTS strand_color text GENERATED ALWAYS AS (fiber_color) STORED;

-- 5. Extend Fiber Enclosures (Cabinet & Coordinates hierarchy)
ALTER TABLE public.fiber_enclosures DROP CONSTRAINT IF EXISTS fiber_enclosures_enclosure_type_check;
ALTER TABLE public.fiber_enclosures ADD CONSTRAINT fiber_enclosures_enclosure_type_check
    CHECK (enclosure_type IN ('Splice Enclosure', 'Patch Panel', 'Cabinet Enclosure', 'Wall Mount', 'Underground Closure', 'Custom', 'Dome', 'Inline', 'Vault', 'Handhole', 'Cabinet'));

ALTER TABLE public.fiber_enclosures 
ADD COLUMN IF NOT EXISTS cabinet_id uuid REFERENCES public.cabinets(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS latitude double precision CHECK (latitude >= -90.0 AND latitude <= 90.0),
ADD COLUMN IF NOT EXISTS longitude double precision CHECK (longitude >= -180.0 AND longitude <= 180.0);

-- 6. Create Splice Trays Table
CREATE TABLE IF NOT EXISTS public.splice_trays (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    enclosure_id uuid REFERENCES public.fiber_enclosures(id) ON DELETE CASCADE NOT NULL,
    tray_number integer NOT NULL CHECK (tray_number > 0),
    capacity integer DEFAULT 12 NOT NULL CHECK (capacity > 0),
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now(),
    UNIQUE (enclosure_id, tray_number)
);

-- 7. Extend Fiber Splice Records (Loss Tracking & Tray Links)
ALTER TABLE public.fiber_splice_records 
ADD COLUMN IF NOT EXISTS tray_id uuid REFERENCES public.splice_trays(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS splice_loss_db numeric(4,3) CHECK (splice_loss_db >= 0.000),
ADD COLUMN IF NOT EXISTS splice_type text DEFAULT 'Fusion' NOT NULL CHECK (splice_type IN ('Fusion', 'Mechanical', 'Pass Through'));

ALTER TABLE public.fiber_splice_records DROP CONSTRAINT IF EXISTS fiber_splice_records_splice_status_check;
ALTER TABLE public.fiber_splice_records ADD CONSTRAINT fiber_splice_records_splice_status_check
    CHECK (splice_status IN ('Planned', 'Completed', 'Failed', 'Retired', 'Not Spliced', 'Spliced', 'Needs Rework'));

-- 8. Create Unified Fiber Assignments & Strands (TX/RX support)
CREATE TABLE IF NOT EXISTS public.fiber_assignments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    camera_id uuid REFERENCES public.camera_locations(id) ON DELETE SET NULL,
    switch_id uuid REFERENCES public.network_devices(id) ON DELETE SET NULL,
    cabinet_id uuid REFERENCES public.cabinets(id) ON DELETE SET NULL,
    purpose text NOT NULL CHECK (purpose IN ('Camera', 'Switch Uplink', 'Spare', 'Future Expansion', 'Wireless Backhaul', 'Custom')),
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.fiber_assignment_strands (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    assignment_id uuid REFERENCES public.fiber_assignments(id) ON DELETE CASCADE NOT NULL,
    strand_id uuid REFERENCES public.fiber_strands(id) ON DELETE CASCADE UNIQUE NOT NULL, -- Enforces 1 assignment per strand
    strand_role text NOT NULL DEFAULT 'TX' CHECK (strand_role IN ('TX', 'RX', 'BiDi', 'Primary', 'Secondary', 'Spare', 'Custom')),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now(),
    UNIQUE (assignment_id, strand_id)
);

-- 9. Setup Row Level Security (RLS) on new tables
ALTER TABLE public.fiber_buffer_tubes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fiber_cable_pass_throughs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.splice_trays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fiber_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fiber_assignment_strands ENABLE ROW LEVEL SECURITY;

-- 10. Create Organizational RLS Policies
CREATE POLICY all_buffer_tubes ON public.fiber_buffer_tubes FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.organization_members om WHERE om.organization_id = public.fiber_buffer_tubes.organization_id AND om.profile_id = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM public.organization_members om WHERE om.organization_id = public.fiber_buffer_tubes.organization_id AND om.profile_id = auth.uid()));

CREATE POLICY all_pass_throughs ON public.fiber_cable_pass_throughs FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.organization_members om WHERE om.organization_id = public.fiber_cable_pass_throughs.organization_id AND om.profile_id = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM public.organization_members om WHERE om.organization_id = public.fiber_cable_pass_throughs.organization_id AND om.profile_id = auth.uid()));

CREATE POLICY all_splice_trays ON public.splice_trays FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.organization_members om WHERE om.organization_id = public.splice_trays.organization_id AND om.profile_id = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM public.organization_members om WHERE om.organization_id = public.splice_trays.organization_id AND om.profile_id = auth.uid()));

CREATE POLICY all_assignments ON public.fiber_assignments FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.organization_members om WHERE om.organization_id = public.fiber_assignments.organization_id AND om.profile_id = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM public.organization_members om WHERE om.organization_id = public.fiber_assignments.organization_id AND om.profile_id = auth.uid()));

CREATE POLICY all_assignment_strands ON public.fiber_assignment_strands FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.organization_members om WHERE om.organization_id = public.fiber_assignment_strands.organization_id AND om.profile_id = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM public.organization_members om WHERE om.organization_id = public.fiber_assignment_strands.organization_id AND om.profile_id = auth.uid()));

-- 11. Triggers for organization_id
CREATE TRIGGER tr_set_buffer_tube_org_id BEFORE INSERT ON public.fiber_buffer_tubes FOR EACH ROW EXECUTE FUNCTION public.set_infra_org_id_from_project();
CREATE TRIGGER tr_set_pass_through_org_id BEFORE INSERT ON public.fiber_cable_pass_throughs FOR EACH ROW EXECUTE FUNCTION public.set_infra_org_id_from_project();
CREATE TRIGGER tr_set_splice_tray_org_id BEFORE INSERT ON public.splice_trays FOR EACH ROW EXECUTE FUNCTION public.set_infra_org_id_from_project();
CREATE TRIGGER tr_set_assignment_org_id BEFORE INSERT ON public.fiber_assignments FOR EACH ROW EXECUTE FUNCTION public.set_infra_org_id_from_project();
CREATE TRIGGER tr_set_assign_strands_org_id BEFORE INSERT ON public.fiber_assignment_strands FOR EACH ROW EXECUTE FUNCTION public.set_infra_org_id_from_project();

-- Triggers for updated_at
CREATE TRIGGER update_buffer_tubes_updated_at BEFORE UPDATE ON public.fiber_buffer_tubes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pass_throughs_updated_at BEFORE UPDATE ON public.fiber_cable_pass_throughs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_splice_trays_updated_at BEFORE UPDATE ON public.splice_trays FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_assignments_updated_at BEFORE UPDATE ON public.fiber_assignments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_assign_strands_updated_at BEFORE UPDATE ON public.fiber_assignment_strands FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 12. Create database indexes for foreign key joins
CREATE INDEX IF NOT EXISTS idx_fiber_buffer_tubes_cable_id ON public.fiber_buffer_tubes(cable_id);
CREATE INDEX IF NOT EXISTS idx_fiber_cable_pass_throughs_cable ON public.fiber_cable_pass_throughs(cable_id);
CREATE INDEX IF NOT EXISTS idx_fiber_strands_buffer_tube_id ON public.fiber_strands(buffer_tube_id);
CREATE INDEX IF NOT EXISTS idx_splice_trays_enclosure_id ON public.splice_trays(enclosure_id);
CREATE INDEX IF NOT EXISTS idx_fiber_splice_records_tray_id ON public.fiber_splice_records(tray_id);
CREATE INDEX IF NOT EXISTS idx_fiber_assignment_strands_strand_id ON public.fiber_assignment_strands(strand_id);
CREATE INDEX IF NOT EXISTS idx_fiber_assignments_camera ON public.fiber_assignments(camera_id) WHERE camera_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fiber_assignments_switch ON public.fiber_assignments(switch_id) WHERE switch_id IS NOT NULL;

-- 13. Create automated buffer tube and strand generator trigger function
CREATE OR REPLACE FUNCTION public.auto_generate_fiber_buffer_tubes_and_strands()
RETURNS TRIGGER AS $$
DECLARE
    v_colors text[] := ARRAY['Blue', 'Orange', 'Green', 'Brown', 'Slate', 'White', 'Red', 'Black', 'Yellow', 'Violet', 'Rose', 'Aqua'];
    v_total_tubes integer;
    v_tube_index integer;
    v_tube_color text;
    v_strand_start integer;
    v_strand_end integer;
    v_tube_id uuid;
    v_strand_number integer;
    v_fiber_color text;
    v_tube_ids uuid[];
BEGIN
    -- Drop old strands generated by legacy trigger if any (failsafe)
    DELETE FROM public.fiber_strands WHERE cable_id = NEW.id;
    
    -- Calculate buffer tubes (12 cores per tube)
    v_total_tubes := CEIL(NEW.fiber_count::numeric / 12.0);
    
    -- Provision Buffer Tubes
    FOR v_tube_index IN 1..v_total_tubes LOOP
        v_tube_color := v_colors[((v_tube_index - 1) % 12) + 1];
        v_strand_start := ((v_tube_index - 1) * 12) + 1;
        v_strand_end := LEAST(v_tube_index * 12, NEW.fiber_count);
        
        INSERT INTO public.fiber_buffer_tubes (
            project_id,
            organization_id,
            cable_id,
            tube_number,
            tube_color,
            strand_start,
            strand_end
        ) VALUES (
            NEW.project_id,
            NEW.organization_id,
            NEW.id,
            v_tube_index,
            v_tube_color,
            v_strand_start,
            v_strand_end
        ) RETURNING id INTO v_tube_id;
        
        v_tube_ids := array_append(v_tube_ids, v_tube_id);
    END LOOP;
    
    -- Provision Strands referencing their Tube
    FOR v_strand_number IN 1..NEW.fiber_count LOOP
        v_tube_index := ((v_strand_number - 1) / 12) + 1;
        v_tube_id := v_tube_ids[v_tube_index];
        v_fiber_color := v_colors[((v_strand_number - 1) % 12) + 1];
        v_tube_color := v_colors[((v_tube_index - 1) % 12) + 1];
        
        INSERT INTO public.fiber_strands (
            project_id,
            organization_id,
            cable_id,
            buffer_tube_id,
            strand_number,
            tube_color,
            fiber_color,
            splice_status,
            test_status,
            status
        ) VALUES (
            NEW.project_id,
            NEW.organization_id,
            NEW.id,
            v_tube_id,
            v_strand_number,
            v_tube_color,
            v_fiber_color,
            'Not Spliced',
            'Not Tested',
            'Available'
        );
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Replace legacy auto strand generator trigger
DROP TRIGGER IF EXISTS tr_auto_generate_fiber_strands ON public.fiber_cables;

CREATE TRIGGER tr_auto_generate_fiber_buffer_tubes_and_strands
AFTER INSERT ON public.fiber_cables
FOR EACH ROW EXECUTE FUNCTION public.auto_generate_fiber_buffer_tubes_and_strands();

-- 14. Create Splice Tray Capacity Enforcement trigger function
CREATE OR REPLACE FUNCTION public.check_splice_tray_capacity()
RETURNS TRIGGER AS $$
DECLARE
    v_capacity integer;
    v_current_count integer;
BEGIN
    IF NEW.tray_id IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT capacity INTO v_capacity FROM public.splice_trays WHERE id = NEW.tray_id;

    SELECT COUNT(*) INTO v_current_count FROM public.fiber_splice_records
    WHERE tray_id = NEW.tray_id AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);

    IF v_current_count >= v_capacity THEN
        RAISE EXCEPTION 'Tray capacity of % splices exceeded. Current splices in tray: %', v_capacity, v_current_count;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_check_splice_tray_capacity ON public.fiber_splice_records;

CREATE TRIGGER tr_check_splice_tray_capacity
BEFORE INSERT OR UPDATE ON public.fiber_splice_records
FOR EACH ROW EXECUTE FUNCTION public.check_splice_tray_capacity();

-- 15. Create Auto-Spliced and Assigned Strand Status Trigger
CREATE OR REPLACE FUNCTION public.update_fiber_strand_utilization_status_for_id(p_strand_id uuid)
RETURNS void AS $$
DECLARE
    v_spliced boolean;
    v_assigned boolean;
    v_status text;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM public.fiber_splice_records 
        WHERE from_strand_id = p_strand_id OR to_strand_id = p_strand_id
    ) INTO v_spliced;

    SELECT EXISTS (
        SELECT 1 FROM public.fiber_assignment_strands 
        WHERE strand_id = p_strand_id
    ) INTO v_assigned;

    IF v_spliced THEN
        v_status := 'Spliced';
    ELSIF v_assigned THEN
        v_status := 'Assigned';
    ELSE
        v_status := 'Available';
    END IF;

    UPDATE public.fiber_strands 
    SET status = v_status,
        splice_status = CASE WHEN v_spliced THEN 'Spliced' ELSE 'Not Spliced' END
    WHERE id = p_strand_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.update_fiber_strand_utilization_status()
RETURNS TRIGGER AS $$
DECLARE
    v_strand_id uuid;
BEGIN
    IF TG_OP = 'DELETE' THEN
        v_strand_id := OLD.strand_id;
    ELSIF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        v_strand_id := NEW.strand_id;
    END IF;

    IF v_strand_id IS NOT NULL THEN
        PERFORM public.update_fiber_strand_utilization_status_for_id(v_strand_id);
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_update_strand_status_on_assignment ON public.fiber_assignment_strands;
CREATE TRIGGER tr_update_strand_status_on_assignment
AFTER INSERT OR UPDATE OR DELETE ON public.fiber_assignment_strands
FOR EACH ROW EXECUTE FUNCTION public.update_fiber_strand_utilization_status();

CREATE OR REPLACE FUNCTION public.update_strand_status_from_splice_record()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        PERFORM public.update_fiber_strand_utilization_status_for_id(NEW.from_strand_id);
        PERFORM public.update_fiber_strand_utilization_status_for_id(NEW.to_strand_id);
    ELSIF TG_OP = 'DELETE' THEN
        PERFORM public.update_fiber_strand_utilization_status_for_id(OLD.from_strand_id);
        PERFORM public.update_fiber_strand_utilization_status_for_id(OLD.to_strand_id);
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_update_strand_status_on_splice ON public.fiber_splice_records;
CREATE TRIGGER tr_update_strand_status_on_splice
AFTER INSERT OR UPDATE OR DELETE ON public.fiber_splice_records
FOR EACH ROW EXECUTE FUNCTION public.update_strand_status_from_splice_record();

-- 16. Backfill existing cables with buffer tubes and link strands
DO $$
DECLARE
    r_cable RECORD;
    v_colors text[] := ARRAY['Blue', 'Orange', 'Green', 'Brown', 'Slate', 'White', 'Red', 'Black', 'Yellow', 'Violet', 'Rose', 'Aqua'];
    v_total_tubes integer;
    v_tube_index integer;
    v_tube_color text;
    v_strand_start integer;
    v_strand_end integer;
    v_tube_id uuid;
    v_tube_ids uuid[];
    v_strand_number integer;
BEGIN
    FOR r_cable IN SELECT id, project_id, organization_id, fiber_count FROM public.fiber_cables LOOP
        IF NOT EXISTS (SELECT 1 FROM public.fiber_buffer_tubes WHERE cable_id = r_cable.id) THEN
            v_tube_ids := '{}';
            v_total_tubes := CEIL(r_cable.fiber_count::numeric / 12.0);
            
            FOR v_tube_index IN 1..v_total_tubes LOOP
                v_tube_color := v_colors[((v_tube_index - 1) % 12) + 1];
                v_strand_start := ((v_tube_index - 1) * 12) + 1;
                v_strand_end := LEAST(v_tube_index * 12, r_cable.fiber_count);
                
                INSERT INTO public.fiber_buffer_tubes (
                    project_id,
                    organization_id,
                    cable_id,
                    tube_number,
                    tube_color,
                    strand_start,
                    strand_end
                ) VALUES (
                    r_cable.project_id,
                    r_cable.organization_id,
                    r_cable.id,
                    v_tube_index,
                    v_tube_color,
                    v_strand_start,
                    v_strand_end
                ) RETURNING id INTO v_tube_id;
                
                v_tube_ids := array_append(v_tube_ids, v_tube_id);
            END LOOP;
            
            FOR v_strand_number IN 1..r_cable.fiber_count LOOP
                v_tube_index := ((v_strand_number - 1) / 12) + 1;
                v_tube_id := v_tube_ids[v_tube_index];
                
                UPDATE public.fiber_strands 
                SET buffer_tube_id = v_tube_id,
                    status = CASE 
                        WHEN splice_status = 'Spliced' THEN 'Spliced'
                        WHEN assigned_camera_id IS NOT NULL THEN 'Assigned'
                        ELSE 'Available'
                    END
                WHERE cable_id = r_cable.id AND strand_number = v_strand_number;
            END LOOP;
        END IF;
    END LOOP;
END $$;
