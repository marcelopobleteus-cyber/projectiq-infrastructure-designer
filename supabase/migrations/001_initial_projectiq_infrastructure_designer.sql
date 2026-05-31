-- Drop existing objects if they exist to allow clean rebuild
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user_provisioning();
DROP FUNCTION IF EXISTS public.is_org_admin(uuid, uuid) CASCADE;
DROP TABLE IF EXISTS public.bom_items CASCADE;
DROP TABLE IF EXISTS public.field_tasks CASCADE;
DROP TABLE IF EXISTS public.switch_ports CASCADE;
DROP TABLE IF EXISTS public.camera_locations CASCADE;
DROP TABLE IF EXISTS public.network_devices CASCADE;
DROP TABLE IF EXISTS public.camera_models CASCADE;
DROP TABLE IF EXISTS public.projects CASCADE;
DROP TABLE IF EXISTS public.organization_members CASCADE;
DROP TABLE IF EXISTS public.organizations CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

DROP TYPE IF EXISTS public.user_role CASCADE;
DROP TYPE IF EXISTS public.device_type CASCADE;
DROP TYPE IF EXISTS public.port_media_type CASCADE;
DROP TYPE IF EXISTS public.port_assignment_type CASCADE;
DROP TYPE IF EXISTS public.camera_status CASCADE;
DROP TYPE IF EXISTS public.comm_type CASCADE;
DROP TYPE IF EXISTS public.power_type CASCADE;
DROP TYPE IF EXISTS public.task_status CASCADE;
DROP TYPE IF EXISTS public.bom_source_type CASCADE;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enums
CREATE TYPE public.user_role AS ENUM ('owner', 'admin', 'member');
CREATE TYPE public.device_type AS ENUM ('switch', 'nvr', 'router', 'patch_panel', 'other');
CREATE TYPE public.port_media_type AS ENUM ('copper', 'fiber');
CREATE TYPE public.port_assignment_type AS ENUM ('camera', 'device', 'uplink', 'unused');
CREATE TYPE public.camera_status AS ENUM ('planned', 'in_progress', 'complete', 'issue');
CREATE TYPE public.comm_type AS ENUM ('copper', 'fiber', 'wireless');
CREATE TYPE public.power_type AS ENUM ('poe', 'poe+', 'local', 'solar');
CREATE TYPE public.task_status AS ENUM ('pending', 'in_progress', 'completed', 'blocked');
CREATE TYPE public.bom_source_type AS ENUM ('catalog', 'custom');

-- Common update trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language plpgsql;

-- Helper function to check if user is an organization admin/owner (bypasses RLS to avoid recursion)
CREATE OR REPLACE FUNCTION public.is_org_admin(org_id uuid, user_id uuid)
RETURNS boolean
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.organization_members
        WHERE organization_id = org_id
          AND profile_id = user_id
          AND role IN ('owner'::public.user_role, 'admin'::public.user_role)
    );
END;
$$ LANGUAGE plpgsql;

-- Profiles Table
CREATE TABLE public.profiles (
    id uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    full_name text,
    avatar_url text,
    updated_at timestamp with time zone DEFAULT now()
);

-- Organizations Table
CREATE TABLE public.organizations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now()
);

-- Organization Members Table
CREATE TABLE public.organization_members (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    role public.user_role NOT NULL DEFAULT 'member'::public.user_role,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    UNIQUE (organization_id, profile_id)
);

-- Projects Table
CREATE TABLE public.projects (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    name text NOT NULL,
    description text,
    default_latitude numeric(9,6) NOT NULL DEFAULT 0.0,
    default_longitude numeric(9,6) NOT NULL DEFAULT 0.0,
    default_zoom integer NOT NULL DEFAULT 15,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now()
);

-- Camera Models Table
CREATE TABLE public.camera_models (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    manufacturer text NOT NULL,
    model_number text NOT NULL,
    resolution text,
    form_factor text,
    lens_type text,
    power_requirements text,
    estimated_cost numeric(12,2) DEFAULT 0.00,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now()
);

-- Network Devices Table
CREATE TABLE public.network_devices (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    name text NOT NULL,
    device_type public.device_type NOT NULL DEFAULT 'switch'::public.device_type,
    model_number text,
    manufacturer text,
    total_ports integer,
    ip_address text,
    rack_unit text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now()
);

-- Camera Locations Table
CREATE TABLE public.camera_locations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    camera_id_tag text NOT NULL,
    latitude double precision NOT NULL CHECK (latitude >= -90.0 AND latitude <= 90.0),
    longitude double precision NOT NULL CHECK (longitude >= -180.0 AND longitude <= 180.0),
    address_reference text,
    structure_reference text,
    camera_model_id uuid NOT NULL REFERENCES public.camera_models(id) ON DELETE CASCADE,
    communication_type public.comm_type NOT NULL DEFAULT 'copper'::public.comm_type,
    power_type public.power_type NOT NULL DEFAULT 'poe'::public.power_type,
    assigned_network_device_id uuid REFERENCES public.network_devices(id) ON DELETE SET NULL,
    status public.camera_status NOT NULL DEFAULT 'planned'::public.camera_status,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    UNIQUE (project_id, camera_id_tag)
);

-- Switch Ports Table (assigned_camera_location_id is unique -> 1-to-1 camera-to-port assignment MVP rule)
CREATE TABLE public.switch_ports (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    network_device_id uuid REFERENCES public.network_devices(id) ON DELETE CASCADE NOT NULL,
    port_number integer NOT NULL,
    assigned_camera_location_id uuid REFERENCES public.camera_locations(id) ON DELETE SET NULL UNIQUE,
    poe_enabled boolean DEFAULT true NOT NULL,
    vlan_id integer DEFAULT 1 NOT NULL,
    status text DEFAULT 'active' NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now(),
    UNIQUE (network_device_id, port_number)
);

-- Field Tasks Table
CREATE TABLE public.field_tasks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    title text NOT NULL,
    description text,
    status public.task_status DEFAULT 'pending'::public.task_status NOT NULL,
    assigned_to uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    due_date timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now()
);

-- BOM Items Table
CREATE TABLE public.bom_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    category text NOT NULL,
    part_number text,
    description text NOT NULL,
    quantity numeric(12,2) DEFAULT 1.00 NOT NULL,
    unit text DEFAULT 'pcs' NOT NULL,
    unit_cost numeric(12,2) DEFAULT 0.00 NOT NULL,
    source public.bom_source_type NOT NULL DEFAULT 'catalog'::public.bom_source_type,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now()
);

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON public.organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_camera_models_updated_at BEFORE UPDATE ON public.camera_models FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_network_devices_updated_at BEFORE UPDATE ON public.network_devices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_camera_locations_updated_at BEFORE UPDATE ON public.camera_locations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_switch_ports_updated_at BEFORE UPDATE ON public.switch_ports FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_field_tasks_updated_at BEFORE UPDATE ON public.field_tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bom_items_updated_at BEFORE UPDATE ON public.bom_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.camera_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.network_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.camera_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.switch_ports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.field_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bom_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Profiles Policies
CREATE POLICY select_profiles ON public.profiles FOR SELECT TO authenticated
USING (
  auth.uid() = id
  OR
  EXISTS (
    SELECT 1 FROM public.organization_members om1
    JOIN public.organization_members om2 ON om1.organization_id = om2.organization_id
    WHERE om1.profile_id = auth.uid() AND om2.profile_id = public.profiles.id
  )
);

CREATE POLICY update_profiles ON public.profiles FOR UPDATE TO authenticated
USING (auth.uid() = id);

-- Organizations Policies
CREATE POLICY select_organizations ON public.organizations FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.organization_members WHERE organization_id = public.organizations.id AND profile_id = auth.uid()
  )
);

CREATE POLICY update_organizations ON public.organizations FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.organization_members WHERE organization_id = public.organizations.id AND profile_id = auth.uid() AND role IN ('owner'::public.user_role, 'admin'::public.user_role)
  )
);

-- Organization Members Policies
CREATE POLICY select_organization_members ON public.organization_members FOR SELECT TO authenticated
USING (true);

CREATE POLICY modify_organization_members ON public.organization_members FOR ALL TO authenticated
USING (
  public.is_org_admin(organization_id, auth.uid())
);

-- Projects Policies
CREATE POLICY all_projects ON public.projects FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.organization_members WHERE organization_id = public.projects.organization_id AND profile_id = auth.uid()
  )
);

-- Camera Models Policies (Read-only for authenticated users)
CREATE POLICY select_camera_models ON public.camera_models FOR SELECT TO authenticated
USING (true);

-- Network Devices Policies
CREATE POLICY all_network_devices ON public.network_devices FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    JOIN public.organization_members om ON p.organization_id = om.organization_id
    WHERE p.id = public.network_devices.project_id AND om.profile_id = auth.uid()
  )
);

-- Camera Locations Policies
CREATE POLICY all_camera_locations ON public.camera_locations FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    JOIN public.organization_members om ON p.organization_id = om.organization_id
    WHERE p.id = public.camera_locations.project_id AND om.profile_id = auth.uid()
  )
);

-- Switch Ports Policies
CREATE POLICY all_switch_ports ON public.switch_ports FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.network_devices nd
    JOIN public.projects p ON nd.project_id = p.id
    JOIN public.organization_members om ON p.organization_id = om.organization_id
    WHERE nd.id = public.switch_ports.network_device_id AND om.profile_id = auth.uid()
  )
);

-- Field Tasks Policies
CREATE POLICY all_field_tasks ON public.field_tasks FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    JOIN public.organization_members om ON p.organization_id = om.organization_id
    WHERE p.id = public.field_tasks.project_id AND om.profile_id = auth.uid()
  )
);

-- BOM Items Policies
CREATE POLICY all_bom_items ON public.bom_items FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    JOIN public.organization_members om ON p.organization_id = om.organization_id
    WHERE p.id = public.bom_items.project_id AND om.profile_id = auth.uid()
  )
);

-- Auth User Provisioning Trigger
CREATE OR REPLACE FUNCTION public.handle_new_user_provisioning()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    new_org_id uuid;
    org_name text;
    full_name_val text;
BEGIN
    full_name_val := COALESCE(new.raw_user_meta_data->>'full_name', 'User');
    org_name := COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)) || '''s Org';

    -- Create profile
    INSERT INTO public.profiles (id, full_name, avatar_url)
    VALUES (new.id, full_name_val, new.raw_user_meta_data->>'avatar_url')
    ON CONFLICT (id) DO NOTHING;

    -- Create organization
    INSERT INTO public.organizations (name)
    VALUES (org_name)
    RETURNING id INTO new_org_id;

    -- Add user as owner
    INSERT INTO public.organization_members (organization_id, profile_id, role)
    VALUES (new_org_id, new.id, 'owner'::public.user_role);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_provisioning();

-- Initial Camera Model Seed Data
INSERT INTO public.camera_models (manufacturer, model_number, resolution, form_factor, lens_type, power_requirements, estimated_cost)
VALUES
('Axis Communications', 'P3245-LVE', '1080p (2MP)', 'Dome', 'Varifocal (3.4-8.9mm)', 'PoE (Class 3)', 549.00),
('Axis Communications', 'Q1615-LE Mk III', '1080p (2MP)', 'Box', 'Varifocal (2.8-8.5mm)', 'PoE+ (Class 4)', 899.00),
('Hanwha Vision', 'XNV-8080R', '5MP', 'Dome', 'Varifocal (3.9-9.4mm)', 'PoE (Class 3)', 479.00),
('Hanwha Vision', 'QNO-8080R', '5MP', 'Bullet', 'Varifocal (3.2-10mm)', 'PoE (Class 3)', 299.00),
('Avigilon', '4.0C-H5A-BO1-IR', '4MP', 'Bullet', 'Varifocal (3.3-9mm)', 'PoE (Class 3)', 620.00);
