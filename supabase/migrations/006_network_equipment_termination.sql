-- Migration: 006_network_equipment_termination.sql
-- Description: Creates Cabinets, FDUs, FPPs, Fiber Patch Cords, and updates Network Devices/Ports with RLS WITH CHECK validation.

-- 1. Alter Database Enums to support new equipment & port types
ALTER TYPE public.device_type ADD VALUE IF NOT EXISTS 'Industrial Switch';
ALTER TYPE public.device_type ADD VALUE IF NOT EXISTS 'Wireless Radio';
ALTER TYPE public.device_type ADD VALUE IF NOT EXISTS 'UPS';
ALTER TYPE public.device_type ADD VALUE IF NOT EXISTS 'Media Converter';
ALTER TYPE public.device_type ADD VALUE IF NOT EXISTS 'Power Supply';
ALTER TYPE public.device_type ADD VALUE IF NOT EXISTS 'Custom';

ALTER TYPE public.port_media_type ADD VALUE IF NOT EXISTS 'rj45';
ALTER TYPE public.port_media_type ADD VALUE IF NOT EXISTS 'sfp';
ALTER TYPE public.port_media_type ADD VALUE IF NOT EXISTS 'sfp_plus';
ALTER TYPE public.port_media_type ADD VALUE IF NOT EXISTS 'qsfp';
ALTER TYPE public.port_media_type ADD VALUE IF NOT EXISTS 'fiber_uplink';
ALTER TYPE public.port_media_type ADD VALUE IF NOT EXISTS 'fiber_lc';

ALTER TYPE public.port_assignment_type ADD VALUE IF NOT EXISTS 'downlink';
ALTER TYPE public.port_assignment_type ADD VALUE IF NOT EXISTS 'management';
ALTER TYPE public.port_assignment_type ADD VALUE IF NOT EXISTS 'unassigned';

-- 2. Create Cabinets Table
CREATE TABLE IF NOT EXISTS public.cabinets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    cabinet_tag text NOT NULL,
    cabinet_type text NOT NULL CHECK (cabinet_type IN ('CCTV Cabinet', 'Traffic Cabinet', 'Fiber Cabinet', 'Custom Cabinet')),
    latitude double precision NOT NULL CHECK (latitude >= -90.0 AND latitude <= 90.0),
    longitude double precision NOT NULL CHECK (longitude >= -180.0 AND longitude <= 180.0),
    status text NOT NULL DEFAULT 'Planned' CHECK (status IN ('Planned', 'Installed', 'Existing', 'Blocked', 'Needs Survey', 'Removed')),
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now(),
    UNIQUE (project_id, cabinet_tag)
);

-- 3. Create Fiber Distribution Units (FDU) Table
CREATE TABLE IF NOT EXISTS public.fiber_distribution_units (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    fdu_tag text NOT NULL,
    cabinet_id uuid REFERENCES public.cabinets(id) ON DELETE SET NULL,
    fiber_capacity integer DEFAULT 12 NOT NULL CHECK (fiber_capacity > 0),
    assigned_backbone_cable_id uuid REFERENCES public.fiber_cables(id) ON DELETE SET NULL,
    status text NOT NULL DEFAULT 'Planned',
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now(),
    UNIQUE (project_id, fdu_tag)
);

-- 4. Create Fiber Patch Panels (FPP) Table
CREATE TABLE IF NOT EXISTS public.fiber_patch_panels (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    fpp_tag text NOT NULL,
    cabinet_id uuid REFERENCES public.cabinets(id) ON DELETE SET NULL,
    port_count integer DEFAULT 12 NOT NULL CHECK (port_count > 0),
    assigned_fdu_id uuid REFERENCES public.fiber_distribution_units(id) ON DELETE SET NULL,
    status text NOT NULL DEFAULT 'Planned',
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now(),
    UNIQUE (project_id, fpp_tag)
);

-- 5. Create Fiber Patch Cords (Fiber Jumpers) Table
CREATE TABLE IF NOT EXISTS public.fiber_patch_cords (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    patch_cord_tag text NOT NULL,
    jumper_type text NOT NULL CHECK (jumper_type IN ('LC-LC Jumper', 'LC-SC Jumper', 'SC-SC Jumper', 'Patch Cord', 'Custom')),
    length_feet numeric(5,2) DEFAULT 3.00 NOT NULL CHECK (length_feet > 0.0),
    connector_a text CHECK (connector_a IN ('LC', 'SC', 'ST', 'FC', 'MPO', 'Custom')),
    connector_b text CHECK (connector_b IN ('LC', 'SC', 'ST', 'FC', 'MPO', 'Custom')),
    polarity text CHECK (polarity IN ('A-to-A', 'A-to-B', 'Straight', 'Custom')),
    from_fdu_id uuid REFERENCES public.fiber_distribution_units(id) ON DELETE SET NULL,
    from_fpp_id uuid REFERENCES public.fiber_patch_panels(id) ON DELETE SET NULL,
    to_fpp_id uuid REFERENCES public.fiber_patch_panels(id) ON DELETE SET NULL,
    to_port_id uuid REFERENCES public.switch_ports(id) ON DELETE SET NULL,
    status text NOT NULL DEFAULT 'Planned' CHECK (status IN ('Planned', 'Installed', 'Existing', 'Failed', 'Needs Rework')),
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now(),
    UNIQUE (project_id, patch_cord_tag)
);

-- 6. Alter public.network_devices (Network Equipment) to add cabinet link and status
ALTER TABLE public.network_devices 
ADD COLUMN IF NOT EXISTS cabinet_id uuid REFERENCES public.cabinets(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS status text DEFAULT 'Planned' NOT NULL;

-- 7. Alter public.switch_ports (Network Ports) to support fiber/cable termination links
ALTER TABLE public.switch_ports
ADD COLUMN IF NOT EXISTS assigned_fiber_cable_id uuid REFERENCES public.fiber_cables(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS assigned_fiber_strand_id uuid REFERENCES public.fiber_strands(id) ON DELETE SET NULL;

-- 8. Alter public.camera_fiber_assignments to track complete equipment patch details
ALTER TABLE public.camera_fiber_assignments
ADD COLUMN IF NOT EXISTS connectivity_path_type text DEFAULT 'Fiber -> Camera' NOT NULL 
    CHECK (connectivity_path_type IN ('Fiber -> Camera', 'Fiber -> Switch -> Camera', 'Fiber -> Switch -> Wireless Radio -> Camera')),
ADD COLUMN IF NOT EXISTS assigned_cabinet_id uuid REFERENCES public.cabinets(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS assigned_switch_id uuid REFERENCES public.network_devices(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS assigned_switch_port_id uuid REFERENCES public.switch_ports(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS assigned_sfp_port_id uuid REFERENCES public.switch_ports(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS assigned_fpp_id uuid REFERENCES public.fiber_patch_panels(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS assigned_fdu_id uuid REFERENCES public.fiber_distribution_units(id) ON DELETE SET NULL;

-- 9. Enable Row Level Security (RLS) on new tables
ALTER TABLE public.cabinets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fiber_distribution_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fiber_patch_panels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fiber_patch_cords ENABLE ROW LEVEL SECURITY;

-- 10. Create RLS Policies with explicit USING and WITH CHECK constraints for organizational isolation
CREATE POLICY all_cabinets ON public.cabinets FOR ALL TO authenticated 
USING (
    EXISTS (SELECT 1 FROM public.organization_members om WHERE om.organization_id = public.cabinets.organization_id AND om.profile_id = auth.uid())
) WITH CHECK (
    EXISTS (SELECT 1 FROM public.organization_members om WHERE om.organization_id = public.cabinets.organization_id AND om.profile_id = auth.uid())
);

CREATE POLICY all_fdus ON public.fiber_distribution_units FOR ALL TO authenticated 
USING (
    EXISTS (SELECT 1 FROM public.organization_members om WHERE om.organization_id = public.fiber_distribution_units.organization_id AND om.profile_id = auth.uid())
) WITH CHECK (
    EXISTS (SELECT 1 FROM public.organization_members om WHERE om.organization_id = public.fiber_distribution_units.organization_id AND om.profile_id = auth.uid())
);

CREATE POLICY all_fpps ON public.fiber_patch_panels FOR ALL TO authenticated 
USING (
    EXISTS (SELECT 1 FROM public.organization_members om WHERE om.organization_id = public.fiber_patch_panels.organization_id AND om.profile_id = auth.uid())
) WITH CHECK (
    EXISTS (SELECT 1 FROM public.organization_members om WHERE om.organization_id = public.fiber_patch_panels.organization_id AND om.profile_id = auth.uid())
);

CREATE POLICY all_patch_cords ON public.fiber_patch_cords FOR ALL TO authenticated 
USING (
    EXISTS (SELECT 1 FROM public.organization_members om WHERE om.organization_id = public.fiber_patch_cords.organization_id AND om.profile_id = auth.uid())
) WITH CHECK (
    EXISTS (SELECT 1 FROM public.organization_members om WHERE om.organization_id = public.fiber_patch_cords.organization_id AND om.profile_id = auth.uid())
);

-- 11. Create infrastructure specific organization_id helper function to avoid namespace collisions
CREATE OR REPLACE FUNCTION public.set_infra_org_id_from_project()
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

-- 12. Attach triggers to auto-fill organization_id from project
CREATE TRIGGER tr_set_cabinet_org_id BEFORE INSERT ON public.cabinets FOR EACH ROW EXECUTE FUNCTION public.set_infra_org_id_from_project();
CREATE TRIGGER tr_set_fdu_org_id BEFORE INSERT ON public.fiber_distribution_units FOR EACH ROW EXECUTE FUNCTION public.set_infra_org_id_from_project();
CREATE TRIGGER tr_set_fpp_org_id BEFORE INSERT ON public.fiber_patch_panels FOR EACH ROW EXECUTE FUNCTION public.set_infra_org_id_from_project();
CREATE TRIGGER tr_set_patch_cord_org_id BEFORE INSERT ON public.fiber_patch_cords FOR EACH ROW EXECUTE FUNCTION public.set_infra_org_id_from_project();
