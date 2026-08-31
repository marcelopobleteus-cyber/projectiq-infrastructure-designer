-- Migration: 025_organization_contact_details.sql
-- Description: Adds logo, contact information, and address columns to public.organizations,
-- and provisions the company-logos storage bucket with RLS policies.

-- 1. Add contact and branding fields to public.organizations
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS contact_name text,
  ADD COLUMN IF NOT EXISTS contact_email text,
  ADD COLUMN IF NOT EXISTS contact_phone text,
  ADD COLUMN IF NOT EXISTS address text;

-- 2. Storage bucket for logos, public read (logos need to display without auth), platform-admin-only write.
INSERT INTO storage.buckets (id, name, public)
VALUES ('company-logos', 'company-logos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public read access to company logos" ON storage.objects;
CREATE POLICY "Public read access to company logos" ON storage.objects FOR SELECT
USING (bucket_id = 'company-logos');

DROP POLICY IF EXISTS "Platform admins can upload company logos" ON storage.objects;
CREATE POLICY "Platform admins can upload company logos" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'company-logos' AND public.is_platform_admin(auth.uid()));

DROP POLICY IF EXISTS "Platform admins can update company logos" ON storage.objects;
CREATE POLICY "Platform admins can update company logos" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'company-logos' AND public.is_platform_admin(auth.uid()));

DROP POLICY IF EXISTS "Platform admins can delete company logos" ON storage.objects;
CREATE POLICY "Platform admins can delete company logos" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'company-logos' AND public.is_platform_admin(auth.uid()));
