-- Migration: 008_field_tech_statuses.sql
-- Description: Adds technician-mode statuses to camera_fiber_assignments and updates strand status trigger to check for completed splices.

-- 1. Drop the existing constraint on camera_fiber_assignments
ALTER TABLE public.camera_fiber_assignments DROP CONSTRAINT IF EXISTS camera_fiber_assignments_fiber_path_status_check;

-- 2. Add the new updated check constraint supporting the field tech statuses
ALTER TABLE public.camera_fiber_assignments ADD CONSTRAINT camera_fiber_assignments_fiber_path_status_check
    CHECK (fiber_path_status IN (
        'Planned', 
        'Fiber Pulled', 
        'Splicing Pending', 
        'Spliced', 
        'Testing Pending', 
        'Tested', 
        'Connected', 
        'Complete', 
        'Blocked',
        'Fiber Pair Assigned',
        'Mainhole Splicing Pending',
        'Cabinet Splicing Pending',
        'Mainhole Splices Complete',
        'Cabinet Splices Complete',
        'Fiber Pair Complete'
    ));

-- 3. Update the trigger function update_fiber_strand_utilization_status_for_id
CREATE OR REPLACE FUNCTION public.update_fiber_strand_utilization_status_for_id(p_strand_id uuid)
RETURNS void AS $$
DECLARE
    v_spliced boolean;
    v_assigned boolean;
    v_status text;
BEGIN
    -- Only consider it spliced if the splice is actually 'Completed' or 'Spliced'
    SELECT EXISTS (
        SELECT 1 FROM public.fiber_splice_records 
        WHERE (from_strand_id = p_strand_id OR to_strand_id = p_strand_id)
          AND splice_status IN ('Completed', 'Spliced')
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
