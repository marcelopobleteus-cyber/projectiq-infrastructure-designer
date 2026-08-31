-- Migration: 026_lock_org_billing_fields.sql
-- Description: Prevents an organization's own owner/admin from changing billing- and
-- suspension-related fields directly. Only Platform Superadmins (via /admin actions) and
-- the service-role Stripe webhook may change these — matches the pattern already used
-- for is_platform_admin in migration 021.

CREATE OR REPLACE FUNCTION public.prevent_org_billing_field_tampering()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF (NEW.status IS DISTINCT FROM OLD.status
        OR NEW.billing_status IS DISTINCT FROM OLD.billing_status
        OR NEW.stripe_customer_id IS DISTINCT FROM OLD.stripe_customer_id
        OR NEW.stripe_subscription_id IS DISTINCT FROM OLD.stripe_subscription_id
        OR NEW.current_period_end IS DISTINCT FROM OLD.current_period_end)
    THEN
        IF auth.role() != 'service_role' AND NOT public.is_platform_admin(auth.uid()) THEN
            RAISE EXCEPTION 'Access denied: billing and workspace-status fields can only be changed by Platform Superadmins or the billing system.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_prevent_org_billing_tampering ON public.organizations;
CREATE TRIGGER tr_prevent_org_billing_tampering
BEFORE UPDATE ON public.organizations
FOR EACH ROW
EXECUTE FUNCTION public.prevent_org_billing_field_tampering();
