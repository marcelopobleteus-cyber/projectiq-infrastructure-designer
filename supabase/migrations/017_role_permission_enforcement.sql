-- Migration: 017_role_permission_enforcement.sql
-- Description: Reassigns legacy 'member' roles to 'editor', creates is_org_editor_or_above helper,
-- splits RLS policies into SELECT (members) vs WRITE (editor or above), creates organization_invites,
-- and updates handle_new_user_provisioning trigger function for multi-tenant invite acceptance.

-- 1. Reassign existing 'member' rows to 'editor'
UPDATE public.organization_members
   SET role = 'editor'::public.user_role
 WHERE role = 'member'::public.user_role;

-- 2. Helper function: check if user is editor or above (bypasses RLS to avoid recursion)
CREATE OR REPLACE FUNCTION public.is_org_editor_or_above(org_id uuid, user_id uuid)
RETURNS boolean
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.organization_members
        WHERE organization_id = org_id
          AND profile_id = user_id
          AND role IN ('owner'::public.user_role, 'admin'::public.user_role, 'editor'::public.user_role)
    );
END;
$$ LANGUAGE plpgsql;

-- 3. Split FOR ALL RLS policies into SELECT (members) vs WRITE (editor or above)

-- Projects Policies
DROP POLICY IF EXISTS all_projects ON public.projects;
DROP POLICY IF EXISTS select_projects ON public.projects;
DROP POLICY IF EXISTS write_projects ON public.projects;

CREATE POLICY select_projects ON public.projects FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.organization_members WHERE organization_id = public.projects.organization_id AND profile_id = auth.uid()
));

CREATE POLICY write_projects ON public.projects FOR ALL TO authenticated
USING (public.is_org_editor_or_above(organization_id, auth.uid()))
WITH CHECK (public.is_org_editor_or_above(organization_id, auth.uid()));

-- Camera Locations Policies
DROP POLICY IF EXISTS all_camera_locations ON public.camera_locations;
DROP POLICY IF EXISTS select_camera_locations ON public.camera_locations;
DROP POLICY IF EXISTS write_camera_locations ON public.camera_locations;

CREATE POLICY select_camera_locations ON public.camera_locations FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.projects p
  JOIN public.organization_members om ON p.organization_id = om.organization_id
  WHERE p.id = public.camera_locations.project_id AND om.profile_id = auth.uid()
));

CREATE POLICY write_camera_locations ON public.camera_locations FOR ALL TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.projects p
  WHERE p.id = public.camera_locations.project_id AND public.is_org_editor_or_above(p.organization_id, auth.uid())
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.projects p
  WHERE p.id = public.camera_locations.project_id AND public.is_org_editor_or_above(p.organization_id, auth.uid())
));

-- Network Devices Policies
DROP POLICY IF EXISTS all_network_devices ON public.network_devices;
DROP POLICY IF EXISTS select_network_devices ON public.network_devices;
DROP POLICY IF EXISTS write_network_devices ON public.network_devices;

CREATE POLICY select_network_devices ON public.network_devices FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.projects p
  JOIN public.organization_members om ON p.organization_id = om.organization_id
  WHERE p.id = public.network_devices.project_id AND om.profile_id = auth.uid()
));

CREATE POLICY write_network_devices ON public.network_devices FOR ALL TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.projects p
  WHERE p.id = public.network_devices.project_id AND public.is_org_editor_or_above(p.organization_id, auth.uid())
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.projects p
  WHERE p.id = public.network_devices.project_id AND public.is_org_editor_or_above(p.organization_id, auth.uid())
));

-- Switch Ports Policies
DROP POLICY IF EXISTS all_switch_ports ON public.switch_ports;
DROP POLICY IF EXISTS select_switch_ports ON public.switch_ports;
DROP POLICY IF EXISTS write_switch_ports ON public.switch_ports;

CREATE POLICY select_switch_ports ON public.switch_ports FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.network_devices nd
  JOIN public.projects p ON nd.project_id = p.id
  JOIN public.organization_members om ON p.organization_id = om.organization_id
  WHERE nd.id = public.switch_ports.network_device_id AND om.profile_id = auth.uid()
));

CREATE POLICY write_switch_ports ON public.switch_ports FOR ALL TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.network_devices nd
  JOIN public.projects p ON nd.project_id = p.id
  WHERE nd.id = public.switch_ports.network_device_id AND public.is_org_editor_or_above(p.organization_id, auth.uid())
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.network_devices nd
  JOIN public.projects p ON nd.project_id = p.id
  WHERE nd.id = public.switch_ports.network_device_id AND public.is_org_editor_or_above(p.organization_id, auth.uid())
));

-- Field Tasks Policies
DROP POLICY IF EXISTS all_field_tasks ON public.field_tasks;
DROP POLICY IF EXISTS select_field_tasks ON public.field_tasks;
DROP POLICY IF EXISTS write_field_tasks ON public.field_tasks;

CREATE POLICY select_field_tasks ON public.field_tasks FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.projects p
  JOIN public.organization_members om ON p.organization_id = om.organization_id
  WHERE p.id = public.field_tasks.project_id AND om.profile_id = auth.uid()
));

CREATE POLICY write_field_tasks ON public.field_tasks FOR ALL TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.projects p
  WHERE p.id = public.field_tasks.project_id AND public.is_org_editor_or_above(p.organization_id, auth.uid())
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.projects p
  WHERE p.id = public.field_tasks.project_id AND public.is_org_editor_or_above(p.organization_id, auth.uid())
));

-- Camera Tasks Policies (from migration 004)
DROP POLICY IF EXISTS all_camera_tasks ON public.camera_tasks;
DROP POLICY IF EXISTS select_camera_tasks ON public.camera_tasks;
DROP POLICY IF EXISTS write_camera_tasks ON public.camera_tasks;

CREATE POLICY select_camera_tasks ON public.camera_tasks FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.projects p
  JOIN public.organization_members om ON p.organization_id = om.organization_id
  WHERE p.id = public.camera_tasks.project_id AND om.profile_id = auth.uid()
));

CREATE POLICY write_camera_tasks ON public.camera_tasks FOR ALL TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.projects p
  WHERE p.id = public.camera_tasks.project_id AND public.is_org_editor_or_above(p.organization_id, auth.uid())
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.projects p
  WHERE p.id = public.camera_tasks.project_id AND public.is_org_editor_or_above(p.organization_id, auth.uid())
));

-- BOM Items Policies
DROP POLICY IF EXISTS all_bom_items ON public.bom_items;
DROP POLICY IF EXISTS select_bom_items ON public.bom_items;
DROP POLICY IF EXISTS write_bom_items ON public.bom_items;

CREATE POLICY select_bom_items ON public.bom_items FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.projects p
  JOIN public.organization_members om ON p.organization_id = om.organization_id
  WHERE p.id = public.bom_items.project_id AND om.profile_id = auth.uid()
));

CREATE POLICY write_bom_items ON public.bom_items FOR ALL TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.projects p
  WHERE p.id = public.bom_items.project_id AND public.is_org_editor_or_above(p.organization_id, auth.uid())
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.projects p
  WHERE p.id = public.bom_items.project_id AND public.is_org_editor_or_above(p.organization_id, auth.uid())
));

-- 4. Create Organization Invites Table
CREATE TABLE IF NOT EXISTS public.organization_invites (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    email text NOT NULL,
    role public.user_role NOT NULL DEFAULT 'editor'::public.user_role,
    invited_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','revoked','expired')),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone DEFAULT (now() + interval '7 days') NOT NULL
);

CREATE INDEX IF NOT EXISTS organization_invites_email_idx ON public.organization_invites (lower(email)) WHERE status = 'pending';

ALTER TABLE public.organization_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS manage_invites ON public.organization_invites;
CREATE POLICY manage_invites ON public.organization_invites FOR ALL TO authenticated
USING (public.is_org_admin(organization_id, auth.uid()))
WITH CHECK (public.is_org_admin(organization_id, auth.uid()));

-- 5. Update Auth User Provisioning Trigger Function for Invite Acceptance
CREATE OR REPLACE FUNCTION public.handle_new_user_provisioning()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    new_org_id uuid;
    org_name text;
    full_name_val text;
    invite_row RECORD;
BEGIN
    full_name_val := COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1));

    -- Create profile
    INSERT INTO public.profiles (id, full_name, avatar_url)
    VALUES (new.id, full_name_val, new.raw_user_meta_data->>'avatar_url')
    ON CONFLICT (id) DO NOTHING;

    -- Check for a matching pending invite
    SELECT * INTO invite_row
      FROM public.organization_invites
     WHERE lower(email) = lower(new.email)
       AND status = 'pending'
       AND expires_at > now()
     ORDER BY created_at DESC
     LIMIT 1;

    IF invite_row IS NOT NULL THEN
        -- Add user to invited organization with invited role
        INSERT INTO public.organization_members (organization_id, profile_id, role)
        VALUES (invite_row.organization_id, new.id, invite_row.role)
        ON CONFLICT DO NOTHING;

        -- Mark invite as accepted
        UPDATE public.organization_invites
           SET status = 'accepted'
         WHERE id = invite_row.id;
    ELSE
        -- Default self-serve signup: Create brand-new organization and add user as owner
        org_name := full_name_val || '''s Org';

        INSERT INTO public.organizations (name)
        VALUES (org_name)
        RETURNING id INTO new_org_id;

        INSERT INTO public.organization_members (organization_id, profile_id, role)
        VALUES (new_org_id, new.id, 'owner'::public.user_role);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
