-- Migration: 024_invite_acceptance.sql
-- Description: Lets an already-registered user pick up pending invites on login/callback.
-- handle_new_user_provisioning() (migration 019) already handles this correctly for brand-new
-- signups; this covers the one path it can't reach — an existing account invited afterward.

CREATE OR REPLACE FUNCTION public.reconcile_pending_invites()
RETURNS TABLE(organization_id uuid, organization_name text, member_role public.user_role)
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
DECLARE
    v_user_id uuid := auth.uid();
    v_email text;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN;
    END IF;

    SELECT u.email INTO v_email FROM auth.users u WHERE u.id = v_user_id;
    IF v_email IS NULL THEN
        RETURN;
    END IF;

    RETURN QUERY
    WITH accepted AS (
        UPDATE public.organization_invites oi
           SET status = 'accepted'
         WHERE lower(oi.email) = lower(v_email)
           AND oi.status = 'pending'
           AND oi.expires_at > now()
        RETURNING oi.organization_id, oi.role
    ), joined AS (
        INSERT INTO public.organization_members (organization_id, profile_id, role)
        SELECT a.organization_id, v_user_id, a.role FROM accepted a
        ON CONFLICT (organization_id, profile_id) DO NOTHING
        RETURNING organization_members.organization_id, organization_members.role
    )
    SELECT j.organization_id, o.name, j.role
    FROM joined j
    JOIN public.organizations o ON o.id = j.organization_id;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION public.reconcile_pending_invites() TO authenticated;
