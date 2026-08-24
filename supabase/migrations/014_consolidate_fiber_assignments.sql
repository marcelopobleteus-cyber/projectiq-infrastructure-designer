-- Migration: 014_consolidate_fiber_assignments.sql
-- Description: Adds circuit routing, equipment termination, and status columns to fiber_assignments.

ALTER TABLE public.fiber_assignments
ADD COLUMN IF NOT EXISTS source_node_id uuid REFERENCES public.fiber_nodes(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS enclosure_id uuid REFERENCES public.fiber_enclosures(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS backbone_cable_id uuid REFERENCES public.fiber_cables(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS drop_cable_id uuid REFERENCES public.fiber_cables(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS assigned_fdu_id uuid REFERENCES public.fiber_distribution_units(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS assigned_fpp_id uuid REFERENCES public.fiber_patch_panels(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS assigned_switch_port_id uuid REFERENCES public.switch_ports(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS assigned_sfp_port_id uuid REFERENCES public.switch_ports(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS splice_status text NOT NULL DEFAULT 'Not Spliced'
    CHECK (splice_status IN ('Not Spliced', 'Partially Spliced', 'Spliced', 'Failed', 'Needs Rework')),
ADD COLUMN IF NOT EXISTS test_status text NOT NULL DEFAULT 'Not Tested'
    CHECK (test_status IN ('Not Tested', 'Passed', 'Failed', 'Needs Retest')),
ADD COLUMN IF NOT EXISTS fiber_path_status text NOT NULL DEFAULT 'Planned'
    CHECK (fiber_path_status IN ('Planned', 'Fiber Pulled', 'Splicing Pending', 'Spliced', 'Testing Pending', 'Tested', 'Connected', 'Complete', 'Blocked', 'Fiber Pair Assigned', 'Mainhole Splicing Pending', 'Cabinet Splicing Pending', 'Mainhole Splices Complete', 'Cabinet Splices Complete', 'Fiber Pair Complete')),
ADD COLUMN IF NOT EXISTS connectivity_path_type text NOT NULL DEFAULT 'Fiber -> Camera'
    CHECK (connectivity_path_type IN ('Fiber -> Camera', 'Fiber -> Switch -> Camera', 'Fiber -> Switch -> Wireless Radio -> Camera', 'Fiber -> Device'));
