-- Migration: 020_platform_admin.sql
-- Description: Adds platform superadmin role flag to profiles, creates platform_settings table,
-- configures global RLS bypass policies for platform superadmins across all tenants, and seeds initial platform settings.

-- 1. Add is_platform_admin column to public.profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_platform_admin BOOLEAN DEFAULT false NOT NULL;

CREATE INDEX IF NOT EXISTS profiles_is_platform_admin_idx ON public.profiles (is_platform_admin);

-- 2. Helper function: check if a user is a Platform Admin (bypasses RLS to avoid recursion)
CREATE OR REPLACE FUNCTION public.is_platform_admin(user_id uuid)
RETURNS boolean
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF user_id IS NULL THEN
        RETURN false;
    END IF;

    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = user_id AND is_platform_admin = true
    );
END;
$$ LANGUAGE plpgsql;

-- 3. Platform Settings Table (Key-Value store for system-wide configuration)
CREATE TABLE IF NOT EXISTS public.platform_settings (
    key text PRIMARY KEY,
    value jsonb NOT NULL DEFAULT '{}'::jsonb,
    description text,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- Platform settings policies: Anyone authenticated can read settings, only Platform Admins can modify
DROP POLICY IF EXISTS select_platform_settings ON public.platform_settings;
CREATE POLICY select_platform_settings ON public.platform_settings FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS write_platform_settings ON public.platform_settings;
CREATE POLICY write_platform_settings ON public.platform_settings FOR ALL TO authenticated
USING (public.is_platform_admin(auth.uid()))
WITH CHECK (public.is_platform_admin(auth.uid()));

-- Seed default platform settings
INSERT INTO public.platform_settings (key, value, description)
VALUES
    ('maintenance_mode', '{"enabled": false, "message": "System is currently undergoing scheduled maintenance."}'::jsonb, 'Toggle platform-wide maintenance mode'),
    ('system_announcement', '{"enabled": false, "type": "info", "message": "Welcome to ProjectIQ Platform."}'::jsonb, 'Global announcement banner displayed across all user workspaces'),
    ('allow_signups', '{"enabled": true}'::jsonb, 'Control whether new user self-registrations are allowed'),
    ('default_project_limit', '{"limit": 50}'::jsonb, 'Default max projects allowed per organization')
ON CONFLICT (key) DO NOTHING;

-- 4. Global Platform Admin RLS Policies across all tables

-- Organizations: Platform Admins can view and manage all organizations
DROP POLICY IF EXISTS platform_admin_all_organizations ON public.organizations;
CREATE POLICY platform_admin_all_organizations ON public.organizations FOR ALL TO authenticated
USING (public.is_platform_admin(auth.uid()))
WITH CHECK (public.is_platform_admin(auth.uid()));

-- Profiles: Platform Admins can view and manage all user profiles
DROP POLICY IF EXISTS platform_admin_all_profiles ON public.profiles;
CREATE POLICY platform_admin_all_profiles ON public.profiles FOR ALL TO authenticated
USING (public.is_platform_admin(auth.uid()))
WITH CHECK (public.is_platform_admin(auth.uid()));

-- Organization Members: Platform Admins can view and manage all organization memberships
DROP POLICY IF EXISTS platform_admin_all_org_members ON public.organization_members;
CREATE POLICY platform_admin_all_org_members ON public.organization_members FOR ALL TO authenticated
USING (public.is_platform_admin(auth.uid()))
WITH CHECK (public.is_platform_admin(auth.uid()));

-- Projects: Platform Admins can view and manage all projects across all tenants
DROP POLICY IF EXISTS platform_admin_all_projects ON public.projects;
CREATE POLICY platform_admin_all_projects ON public.projects FOR ALL TO authenticated
USING (public.is_platform_admin(auth.uid()))
WITH CHECK (public.is_platform_admin(auth.uid()));

-- Activity Log: Platform Admins can view complete system-wide audit logs
DROP POLICY IF EXISTS platform_admin_all_activity_log ON public.activity_log;
CREATE POLICY platform_admin_all_activity_log ON public.activity_log FOR SELECT TO authenticated
USING (public.is_platform_admin(auth.uid()));

-- 5. Auto-assign Platform Admin to primary developer and first registered user
UPDATE public.profiles
   SET is_platform_admin = true
 WHERE lower(email) = 'marcelopoblete.us@gmail.com'
    OR lower(email) = 'demo@nextqtechs.com'
    OR id IN (
        SELECT id FROM public.profiles
        ORDER BY updated_at ASC
        LIMIT 1
    );
