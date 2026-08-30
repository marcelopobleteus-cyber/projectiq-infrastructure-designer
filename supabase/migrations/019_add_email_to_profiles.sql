-- Migration: 019_add_email_to_profiles.sql
-- Description: Adds email column to public.profiles to avoid expensive auth.admin queries

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS email VARCHAR(255);

-- Update trigger to populate email
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

    -- Create profile with email
    INSERT INTO public.profiles (id, full_name, avatar_url, email)
    VALUES (new.id, full_name_val, new.raw_user_meta_data->>'avatar_url', new.email)
    ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;

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
