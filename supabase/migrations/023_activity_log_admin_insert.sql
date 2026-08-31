-- Migration: 023_activity_log_admin_insert.sql
-- Description: Adds INSERT and management RLS policies for platform superadmins and organization members on public.activity_log.

-- 1. Allow platform superadmins full access (SELECT, INSERT, UPDATE, DELETE) on activity_log
DROP POLICY IF EXISTS platform_admin_all_activity_log ON public.activity_log;
CREATE POLICY platform_admin_all_activity_log ON public.activity_log
FOR ALL TO authenticated
USING (public.is_platform_admin(auth.uid()))
WITH CHECK (public.is_platform_admin(auth.uid()));

-- 2. Allow authenticated organization members to insert activity logs for their own organization
DROP POLICY IF EXISTS insert_activity_log_org_members ON public.activity_log;
CREATE POLICY insert_activity_log_org_members ON public.activity_log
FOR INSERT TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.organization_members
        WHERE organization_id = public.activity_log.organization_id
          AND profile_id = auth.uid()
    )
);
