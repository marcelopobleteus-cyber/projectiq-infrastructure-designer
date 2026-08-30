-- Migration: 022_billing_modules.sql
-- Description: Catalog of sellable modules, organization module purchases, and Stripe billing lifecycle.

-- 1. Catalog of sellable modules — one row per discipline, plus billing metadata.
CREATE TABLE IF NOT EXISTS public.modules (
    id text PRIMARY KEY,  -- matches discipline ids: cctv, fiber, conduit, networking, wireless, power, lighting
    name text NOT NULL,
    description text,
    default_monthly_price_cents integer NOT NULL DEFAULT 0,
    stripe_price_id text,  -- set by Marcelo once he creates the matching recurring Price in Stripe
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

INSERT INTO public.modules (id, name, description) VALUES
    ('cctv', 'CCTV', 'Camera placement, coverage, and device specification.'),
    ('fiber', 'Fiber', 'Fiber routing, splicing matrix, and hardware catalog.'),
    ('conduit', 'Conduit', 'Conduit and pathway planning.'),
    ('networking', 'Networking', 'Network topology, port assignment, and equipment termination.'),
    ('wireless', 'Wireless', 'Wireless coverage and device planning.'),
    ('power', 'Power', 'Power distribution and PoE budgeting.'),
    ('lighting', 'Lighting', 'Lighting layout and fixtures.')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS select_modules ON public.modules;
CREATE POLICY select_modules ON public.modules FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS write_modules ON public.modules;
CREATE POLICY write_modules ON public.modules FOR ALL TO authenticated
USING (public.is_platform_admin(auth.uid())) WITH CHECK (public.is_platform_admin(auth.uid()));

-- 2. Which modules each organization has purchased.
CREATE TABLE IF NOT EXISTS public.organization_modules (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    module_id text REFERENCES public.modules(id) ON DELETE RESTRICT NOT NULL,
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled')),
    price_cents integer NOT NULL,  -- snapshot of what this org actually pays for this module
    stripe_subscription_item_id text,
    enabled_at timestamp with time zone DEFAULT now() NOT NULL,
    canceled_at timestamp with time zone,
    UNIQUE (organization_id, module_id)
);

ALTER TABLE public.organization_modules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS select_own_org_modules ON public.organization_modules;
CREATE POLICY select_own_org_modules ON public.organization_modules FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.organization_members om WHERE om.organization_id = organization_modules.organization_id AND om.profile_id = auth.uid())
);

DROP POLICY IF EXISTS platform_admin_all_org_modules ON public.organization_modules;
CREATE POLICY platform_admin_all_org_modules ON public.organization_modules FOR ALL TO authenticated
USING (public.is_platform_admin(auth.uid())) WITH CHECK (public.is_platform_admin(auth.uid()));

-- 3. Billing + access-control fields on organizations.
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS billing_status text NOT NULL DEFAULT 'trialing' CHECK (billing_status IN ('trialing', 'active', 'past_due', 'canceled')),
  ADD COLUMN IF NOT EXISTS current_period_end timestamp with time zone;
