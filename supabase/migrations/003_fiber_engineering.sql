-- Drop existing tables if they exist (for clean rebuild in case of retries, using CASCADE)
DROP TABLE IF EXISTS public.camera_fiber_assignments CASCADE;
DROP TABLE IF EXISTS public.fiber_splices CASCADE;
DROP TABLE IF EXISTS public.fiber_cables CASCADE;
DROP TABLE IF EXISTS public.fiber_route_segments CASCADE;
DROP TABLE IF EXISTS public.fiber_routes CASCADE;
DROP TABLE IF EXISTS public.fiber_enclosures CASCADE;
DROP TABLE IF EXISTS public.fiber_nodes CASCADE;
DROP TABLE IF EXISTS public.fiber_catalog CASCADE;

-- 1. Create Fiber Catalog Table
CREATE TABLE public.fiber_catalog (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    manufacturer text NOT NULL,
    fiber_count integer NOT NULL CHECK (fiber_count IN (6, 12, 24, 48, 72, 96, 144, 288)),
    part_number text NOT NULL,
    diameter_mm numeric(5,2) NOT NULL,
    weight_kg_km numeric(6,2) NOT NULL,
    cost_per_meter numeric(12,2) NOT NULL,
    mode text NOT NULL CHECK (mode IN ('Singlemode', 'Multimode')),
    grade text NOT NULL CHECK (grade IN ('OS2', 'OM3', 'OM4', 'OM5')),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now()
);

-- 2. Create Fiber Nodes Table (Handholes, Pull Boxes, Splice Enclosures)
CREATE TABLE public.fiber_nodes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    node_id_tag text NOT NULL,
    node_type text NOT NULL CHECK (node_type IN ('handhole', 'pull_box', 'splice_enclosure')),
    latitude double precision NOT NULL CHECK (latitude >= -90.0 AND latitude <= 90.0),
    longitude double precision NOT NULL CHECK (longitude >= -180.0 AND longitude <= 180.0),
    elevation_m numeric(5,2) DEFAULT 0.0 NOT NULL,
    size_dims text DEFAULT '24x36x36' NOT NULL,
    slack_feet numeric(6,2) DEFAULT 0.0 NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now(),
    UNIQUE (project_id, node_id_tag)
);

-- 3. Create Fiber Enclosures Details Table
CREATE TABLE public.fiber_enclosures (
    id uuid PRIMARY KEY REFERENCES public.fiber_nodes(id) ON DELETE CASCADE,
    closure_type text NOT NULL CHECK (closure_type IN ('Dome Closure', 'Inline Closure', 'Patch Panel', 'ODF')),
    capacity integer NOT NULL DEFAULT 12,
    used_fibers integer NOT NULL DEFAULT 0,
    spare_fibers integer NOT NULL DEFAULT 12,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now()
);

-- 4. Create Fiber Routes Table (Conduit runs/Pathways)
CREATE TABLE public.fiber_routes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    route_id_tag text NOT NULL,
    measured_length_feet numeric(8,2) NOT NULL DEFAULT 0.0,
    slack_percentage numeric(5,2) NOT NULL DEFAULT 10.0,
    installed_length_feet numeric(8,2) NOT NULL DEFAULT 0.0,
    conduit_diameter_inches numeric(4,2) NOT NULL DEFAULT 2.0,
    fill_percentage numeric(5,2) NOT NULL DEFAULT 0.0,
    spare_capacity numeric(5,2) NOT NULL DEFAULT 100.0,
    installation_type text NOT NULL DEFAULT 'underground' CHECK (installation_type IN ('underground', 'aerial', 'direct_buried')),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now(),
    UNIQUE (project_id, route_id_tag)
);

-- 5. Create Fiber Route Segments Table (Supports multiple consecutive segments)
CREATE TABLE public.fiber_route_segments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- 6. Create Fiber Cables Table (Separated from routes)
CREATE TABLE public.fiber_cables (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    route_id uuid REFERENCES public.fiber_routes(id) ON DELETE CASCADE NOT NULL,
    cable_id_tag text NOT NULL,
    catalog_id uuid REFERENCES public.fiber_catalog(id) ON DELETE SET NULL,
    fiber_count integer NOT NULL DEFAULT 12,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now(),
    UNIQUE (project_id, cable_id_tag)
);

-- 7. Create Fiber Splice Matrix Table (References fiber_cables)
CREATE TABLE public.fiber_splices (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    node_id uuid REFERENCES public.fiber_nodes(id) ON DELETE CASCADE NOT NULL,
    cable_a_id uuid REFERENCES public.fiber_cables(id) ON DELETE CASCADE NOT NULL,
    cable_b_id uuid REFERENCES public.fiber_cables(id) ON DELETE CASCADE NOT NULL,
    fiber_number_a integer NOT NULL,
    fiber_number_b integer NOT NULL,
    color text,
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'spare', 'broken')),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now(),
    UNIQUE (node_id, cable_a_id, fiber_number_a)
);

-- 8. Create Camera Fiber Assignments Table (Supports redundant routes)
CREATE TABLE public.camera_fiber_assignments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    camera_id uuid REFERENCES public.camera_locations(id) ON DELETE CASCADE NOT NULL,
    cable_id uuid REFERENCES public.fiber_cables(id) ON DELETE CASCADE NOT NULL,
    enclosure_id uuid REFERENCES public.fiber_nodes(id) ON DELETE CASCADE NOT NULL,
    tx_core integer NOT NULL,
    rx_core integer NOT NULL,
    link_role text NOT NULL DEFAULT 'primary' CHECK (link_role IN ('primary', 'backup')),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now(),
    UNIQUE (camera_id, link_role)
);

-- 9. Add route and node foreign keys to bom_items
ALTER TABLE public.bom_items 
ADD COLUMN IF NOT EXISTS fiber_route_id uuid REFERENCES public.fiber_routes(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS fiber_node_id uuid REFERENCES public.fiber_nodes(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS manufacturer text DEFAULT 'Generic',
ADD COLUMN IF NOT EXISTS status text DEFAULT 'Planned';

-- 10. Enable Row Level Security (RLS) on all new tables
ALTER TABLE public.fiber_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fiber_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fiber_enclosures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fiber_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fiber_route_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fiber_cables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fiber_splices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.camera_fiber_assignments ENABLE ROW LEVEL SECURITY;

-- 11. Create SELECT/ALL RLS Policies for authenticated users
CREATE POLICY all_fiber_catalog ON public.fiber_catalog FOR ALL TO authenticated USING (true);

CREATE POLICY all_fiber_nodes ON public.fiber_nodes FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.projects p JOIN public.organization_members om ON p.organization_id = om.organization_id WHERE p.id = public.fiber_nodes.project_id AND om.profile_id = auth.uid())
);

CREATE POLICY all_fiber_enclosures ON public.fiber_enclosures FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.fiber_nodes fn JOIN public.projects p ON fn.project_id = p.id JOIN public.organization_members om ON p.organization_id = om.organization_id WHERE fn.id = public.fiber_enclosures.id AND om.profile_id = auth.uid())
);

CREATE POLICY all_fiber_routes ON public.fiber_routes FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.projects p JOIN public.organization_members om ON p.organization_id = om.organization_id WHERE p.id = public.fiber_routes.project_id AND om.profile_id = auth.uid())
);

CREATE POLICY all_fiber_route_segments ON public.fiber_route_segments FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.fiber_routes fr JOIN public.projects p ON fr.project_id = p.id JOIN public.organization_members om ON p.organization_id = om.organization_id WHERE fr.id = public.fiber_route_segments.route_id AND om.profile_id = auth.uid())
);

CREATE POLICY all_fiber_cables ON public.fiber_cables FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.projects p JOIN public.organization_members om ON p.organization_id = om.organization_id WHERE p.id = public.fiber_cables.project_id AND om.profile_id = auth.uid())
);

CREATE POLICY all_fiber_splices ON public.fiber_splices FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.fiber_nodes fn JOIN public.projects p ON fn.project_id = p.id JOIN public.organization_members om ON p.organization_id = om.organization_id WHERE fn.id = public.fiber_splices.node_id AND om.profile_id = auth.uid())
);

CREATE POLICY all_camera_fiber_assignments ON public.camera_fiber_assignments FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.fiber_nodes fn JOIN public.projects p ON fn.project_id = p.id JOIN public.organization_members om ON p.organization_id = om.organization_id WHERE fn.id = public.camera_fiber_assignments.enclosure_id AND om.profile_id = auth.uid())
);

-- 12. Create updated_at Triggers
CREATE TRIGGER update_fiber_catalog_updated_at BEFORE UPDATE ON public.fiber_catalog FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_fiber_nodes_updated_at BEFORE UPDATE ON public.fiber_nodes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_fiber_enclosures_updated_at BEFORE UPDATE ON public.fiber_enclosures FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_fiber_routes_updated_at BEFORE UPDATE ON public.fiber_routes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_fiber_route_segments_updated_at BEFORE UPDATE ON public.fiber_route_segments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_fiber_cables_updated_at BEFORE UPDATE ON public.fiber_cables FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_fiber_splices_updated_at BEFORE UPDATE ON public.fiber_splices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_camera_fiber_assignments_updated_at BEFORE UPDATE ON public.camera_fiber_assignments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 13. Seed Fiber Cable Catalog with extended modes and grades
INSERT INTO public.fiber_catalog (manufacturer, fiber_count, part_number, diameter_mm, weight_kg_km, cost_per_meter, mode, grade)
VALUES
('Corning', 6, '006E8F-31131-29', 5.80, 31.00, 1.20, 'Singlemode', 'OS2'),
('Corning', 12, '012E8F-31131-29', 6.20, 35.00, 1.50, 'Singlemode', 'OS2'),
('Corning', 24, '024E8F-31131-29', 7.50, 48.00, 1.80, 'Singlemode', 'OS2'),
('Corning', 48, '048E8F-31131-29', 9.10, 68.00, 2.40, 'Singlemode', 'OS2'),
('Corning', 96, '096E8F-31131-29', 11.20, 95.00, 3.80, 'Singlemode', 'OS2'),
('Corning', 12, '012T8F-31180-29', 6.40, 37.00, 1.65, 'Multimode', 'OM3'),
('Corning', 24, '024T8F-31180-29', 7.80, 50.00, 2.10, 'Multimode', 'OM3'),
('Corning', 12, '012E8F-31190-29', 6.40, 37.00, 1.95, 'Multimode', 'OM4'),
('Corning', 24, '024E8F-31190-29', 7.80, 50.00, 2.45, 'Multimode', 'OM4'),
('Corning', 48, '048E8F-31190-29', 9.40, 71.00, 3.20, 'Multimode', 'OM4'),
('Corning', 24, '024E8F-31195-29', 7.90, 52.00, 2.90, 'Multimode', 'OM5'),
('CommScope', 12, 'D-012-LN-8W-F12NS', 6.00, 33.00, 1.40, 'Singlemode', 'OS2'),
('CommScope', 24, 'D-024-LN-8W-F12NS', 7.20, 45.00, 1.70, 'Singlemode', 'OS2'),
('CommScope', 48, 'D-048-LN-8W-F12NS', 8.80, 65.00, 2.35, 'Singlemode', 'OS2'),
('CommScope', 96, 'D-096-LN-8W-F12NS', 11.00, 92.00, 3.75, 'Singlemode', 'OS2'),
('CommScope', 288, 'D-288-LN-8W-F12NS', 18.20, 215.00, 9.80, 'Singlemode', 'OS2'),
('CommScope', 12, 'D-012-LN-5K-F12NS', 6.20, 35.00, 1.60, 'Multimode', 'OM4'),
('CommScope', 24, 'D-024-LN-5K-F12NS', 7.40, 47.00, 2.05, 'Multimode', 'OM4'),
('OFS', 12, 'AT-3BE8F12-012', 6.10, 34.00, 1.45, 'Singlemode', 'OS2'),
('OFS', 48, 'AT-3BE8F12-048', 8.90, 66.00, 2.40, 'Singlemode', 'OS2'),
('OFS', 144, 'AT-3BE8F12-144', 13.40, 128.00, 5.15, 'Singlemode', 'OS2');
