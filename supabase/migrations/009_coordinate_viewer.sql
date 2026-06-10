-- Migration: 009_coordinate_viewer.sql
-- Description: Creates the project_coordinate_points table with validation, unique constraints, and organization RLS, and adds a seed function.

-- 1. Create table for coordinate points
CREATE TABLE IF NOT EXISTS public.project_coordinate_points (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
    device_id text NOT NULL,
    device_type text, -- inferred from device_id prefix, e.g. CAM or SWITCH
    ip_address text,
    subnet_mask text,
    default_gateway text,
    vlan text,
    latitude double precision NOT NULL CHECK (latitude >= -90.0 AND latitude <= 90.0),
    longitude double precision NOT NULL CHECK (longitude >= -180.0 AND longitude <= 180.0),
    description text,
    source_name text DEFAULT 'WST_SEG6_Google_My_Maps_Import.csv',
    is_read_only boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT unique_project_device UNIQUE (project_id, device_id)
);

-- 2. Create trigger to set organization_id from projects
CREATE OR REPLACE FUNCTION public.set_coordinate_point_organization()
RETURNS TRIGGER AS $$
BEGIN
    SELECT organization_id INTO NEW.organization_id
    FROM public.projects
    WHERE id = NEW.project_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_coordinate_point_organization_trigger ON public.project_coordinate_points;
CREATE TRIGGER set_coordinate_point_organization_trigger
    BEFORE INSERT ON public.project_coordinate_points
    FOR EACH ROW
    EXECUTE FUNCTION public.set_coordinate_point_organization();

-- 3. Create updated_at trigger
DROP TRIGGER IF EXISTS update_project_coordinate_points_updated_at ON public.project_coordinate_points;
CREATE TRIGGER update_project_coordinate_points_updated_at 
    BEFORE UPDATE ON public.project_coordinate_points 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.project_coordinate_points ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS Policies
DROP POLICY IF EXISTS all_project_coordinate_points ON public.project_coordinate_points;
CREATE POLICY all_project_coordinate_points ON public.project_coordinate_points FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = public.project_coordinate_points.organization_id
      AND om.profile_id = auth.uid()
  )
);

-- 6. Create idempotent seed function for WST SEG6 coordinates
-- Note: AGGREGATION_SWITCH (IP 10.150.99.103) is excluded because it has no GPS coordinates in the source Excel file.
CREATE OR REPLACE FUNCTION public.seed_wst_seg6_coordinates(target_project_id uuid)
RETURNS void AS $$
BEGIN
    INSERT INTO public.project_coordinate_points (
        project_id, device_id, device_type, ip_address, subnet_mask, default_gateway, vlan, latitude, longitude, description, source_name, is_read_only
    ) VALUES
    (target_project_id, 'CAM001', 'CAM', '10.150.99.161', '255.255.255.0', '10.150.99.1', '150', 33.732742, -84.424131, 'Westside Beltline Trail SEG 6 CCTV Camera - Device CAM001', 'WST_SEG6_Google_My_Maps_Import.csv', true),
    (target_project_id, 'SWITCH001', 'SWITCH', '10.150.99.162', '255.255.255.0', '10.150.99.1', '150', 33.732742, -84.424131, 'Westside Beltline Trail SEG 6 CCTV Switch - Device SWITCH001', 'WST_SEG6_Google_My_Maps_Import.csv', true),
    (target_project_id, 'CAM002', 'CAM', '10.150.99.163', '255.255.255.0', '10.150.99.1', '150', 33.733120, -84.425189, 'Westside Beltline Trail SEG 6 CCTV Camera - Device CAM002', 'WST_SEG6_Google_My_Maps_Import.csv', true),
    (target_project_id, 'SWITCH002', 'SWITCH', '10.150.99.164', '255.255.255.0', '10.150.99.1', '150', 33.733120, -84.425189, 'Westside Beltline Trail SEG 6 CCTV Switch - Device SWITCH002', 'WST_SEG6_Google_My_Maps_Import.csv', true),
    (target_project_id, 'CAM003', 'CAM', '10.150.99.165', '255.255.255.0', '10.150.99.1', '150', 33.733429, -84.425895, 'Westside Beltline Trail SEG 6 CCTV Camera - Device CAM003', 'WST_SEG6_Google_My_Maps_Import.csv', true),
    (target_project_id, 'SWITCH003', 'SWITCH', '10.150.99.166', '255.255.255.0', '10.150.99.1', '150', 33.733429, -84.425895, 'Westside Beltline Trail SEG 6 CCTV Switch - Device SWITCH003', 'WST_SEG6_Google_My_Maps_Import.csv', true),
    (target_project_id, 'CAM004', 'CAM', '10.150.99.167', '255.255.255.0', '10.150.99.1', '150', 33.734225, -84.427246, 'Westside Beltline Trail SEG 6 CCTV Camera - Device CAM004', 'WST_SEG6_Google_My_Maps_Import.csv', true),
    (target_project_id, 'SWITCH004', 'SWITCH', '10.150.99.168', '255.255.255.0', '10.150.99.1', '150', 33.734225, -84.427246, 'Westside Beltline Trail SEG 6 CCTV Switch - Device SWITCH004', 'WST_SEG6_Google_My_Maps_Import.csv', true),
    (target_project_id, 'CAM005', 'CAM', '10.150.99.169', '255.255.255.0', '10.150.99.1', '150', 33.735067, -84.428613, 'Westside Beltline Trail SEG 6 CCTV Camera - Device CAM005', 'WST_SEG6_Google_My_Maps_Import.csv', true),
    (target_project_id, 'SWITCH005', 'SWITCH', '10.150.99.170', '255.255.255.0', '10.150.99.1', '150', 33.735067, -84.428613, 'Westside Beltline Trail SEG 6 CCTV Switch - Device SWITCH005', 'WST_SEG6_Google_My_Maps_Import.csv', true),
    (target_project_id, 'CAM006', 'CAM', '10.150.99.171', '255.255.255.0', '10.150.99.1', '150', 33.735878, -84.429985, 'Westside Beltline Trail SEG 6 CCTV Camera - Device CAM006', 'WST_SEG6_Google_My_Maps_Import.csv', true),
    (target_project_id, 'SWITCH006', 'SWITCH', '10.150.99.172', '255.255.255.0', '10.150.99.1', '150', 33.735878, -84.429985, 'Westside Beltline Trail SEG 6 CCTV Switch - Device SWITCH006', 'WST_SEG6_Google_My_Maps_Import.csv', true),
    (target_project_id, 'CAM007', 'CAM', '10.150.99.173', '255.255.255.0', '10.150.99.1', '150', 33.736809, -84.431335, 'Westside Beltline Trail SEG 6 CCTV Camera - Device CAM007', 'WST_SEG6_Google_My_Maps_Import.csv', true),
    (target_project_id, 'SWITCH007', 'SWITCH', '10.150.99.174', '255.255.255.0', '10.150.99.1', '150', 33.736809, -84.431335, 'Westside Beltline Trail SEG 6 CCTV Switch - Device SWITCH007', 'WST_SEG6_Google_My_Maps_Import.csv', true),
    (target_project_id, 'CAM008', 'CAM', '10.150.99.175', '255.255.255.0', '10.150.99.1', '150', 33.737228, -84.431496, 'Westside Beltline Trail SEG 6 CCTV Camera - Device CAM008', 'WST_SEG6_Google_My_Maps_Import.csv', true),
    (target_project_id, 'SWITCH008', 'SWITCH', '10.150.99.176', '255.255.255.0', '10.150.99.1', '150', 33.737228, -84.431496, 'Westside Beltline Trail SEG 6 CCTV Switch - Device SWITCH008', 'WST_SEG6_Google_My_Maps_Import.csv', true)
    ON CONFLICT (project_id, device_id) 
    DO UPDATE SET
        device_type = EXCLUDED.device_type,
        ip_address = EXCLUDED.ip_address,
        subnet_mask = EXCLUDED.subnet_mask,
        default_gateway = EXCLUDED.default_gateway,
        vlan = EXCLUDED.vlan,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        description = EXCLUDED.description,
        source_name = EXCLUDED.source_name,
        is_read_only = EXCLUDED.is_read_only,
        updated_at = now();
END;
$$ LANGUAGE plpgsql;
