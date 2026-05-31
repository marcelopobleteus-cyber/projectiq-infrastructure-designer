CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enums
CREATE TYPE task_status AS ENUM ('pending', 'in_progress', 'completed', 'blocked');

-- Common update trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language plpgsql;

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
    role text NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
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
    device_type text NOT NULL CHECK (device_type IN ('switch', 'nvr', 'router', 'patch_panel', 'other')),
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
    camera_model_id uuid REFERENCES public.camera_models(id) ON DELETE SET NULL,
    name text NOT NULL,
    latitude numeric(9,6) NOT NULL,
    longitude numeric(9,6) NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now()
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
    status task_status DEFAULT 'pending'::task_status NOT NULL,
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
    SELECT 1 FROM public.organization_members WHERE organization_id = public.organizations.id AND profile_id = auth.uid() AND role IN ('owner', 'admin')
  )
);

-- Organization Members Policies
CREATE POLICY select_organization_members ON public.organization_members FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.organization_members WHERE organization_id = public.organization_members.organization_id AND profile_id = auth.uid()
  )
);

CREATE POLICY modify_organization_members ON public.organization_members FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.organization_members WHERE organization_id = public.organization_members.organization_id AND profile_id = auth.uid() AND role IN ('owner', 'admin')
  )
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

    -- Add user as owner (Correction 1: owner role)
    INSERT INTO public.organization_members (organization_id, profile_id, role)
    VALUES (new_org_id, new.id, 'owner');

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
