-- Migration: 021_fix_platform_admin_self_grant.sql
-- Description: Closes the platform-admin self-escalation vulnerability by enforcing that
-- only existing Platform Superadmins or the service_role can modify the is_platform_admin flag.

CREATE OR REPLACE FUNCTION public.prevent_platform_admin_self_grant()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Guard on INSERT: Disallow setting is_platform_admin = true unless caller is platform admin or service_role
    IF TG_OP = 'INSERT' THEN
        IF NEW.is_platform_admin = true THEN
            IF auth.role() != 'service_role' AND NOT public.is_platform_admin(auth.uid()) THEN
                RAISE EXCEPTION 'Access denied: Only Platform Superadministrators can grant platform admin privileges.';
            END IF;
        END IF;
    -- Guard on UPDATE: Disallow changing is_platform_admin unless caller is platform admin or service_role
    ELSIF TG_OP = 'UPDATE' THEN
        IF NEW.is_platform_admin IS DISTINCT FROM OLD.is_platform_admin THEN
            IF auth.role() != 'service_role' AND NOT public.is_platform_admin(auth.uid()) THEN
                RAISE EXCEPTION 'Access denied: Only Platform Superadministrators can modify platform admin privileges.';
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_prevent_platform_admin_self_grant ON public.profiles;
CREATE TRIGGER tr_prevent_platform_admin_self_grant
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_platform_admin_self_grant();
