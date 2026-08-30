import Stripe from 'stripe'

let stripeInstance: Stripe | null = null

export function getStripe(): Stripe | null {
  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey) {
    return null
  }

  if (!stripeInstance) {
    stripeInstance = new Stripe(secretKey, {
      apiVersion: '2025-02-24.acacia' as any,
      appInfo: {
        name: 'ProjectIQ Infrastructure Designer',
        version: '0.1.0',
      },
    })
  }

  return stripeInstance
}

export interface CreateCustomerParams {
  email: string
  name: string
  organizationId: string
}

export async function createStripeCustomer(params: CreateCustomerParams): Promise<{ customerId?: string; error?: string }> {
  const stripe = getStripe()
  if (!stripe) {
    return { error: 'STRIPE_SECRET_KEY is not configured on this environment.' }
  }

  try {
    const customer = await stripe.customers.create({
      email: params.email,
      name: params.name,
      metadata: {
        organization_id: params.organizationId,
      },
    })
    return { customerId: customer.id }
  } catch (err: any) {
    console.error('[Stripe] Failed to create customer:', err)
    return { error: err.message || 'Failed to create Stripe customer' }
  }
}

export interface LineItemParam {
  priceId: string
  quantity?: number
}

export interface CreateCheckoutParams {
  customerId?: string
  customerEmail?: string
  organizationId: string
  organizationName: string
  lineItems: LineItemParam[]
  successUrl?: string
  cancelUrl?: string
}

export async function createStripeSubscriptionCheckout(params: CreateCheckoutParams): Promise<{ checkoutUrl?: string; sessionId?: string; error?: string }> {
  const stripe = getStripe()
  if (!stripe) {
    return { error: 'STRIPE_SECRET_KEY is not configured on this environment.' }
  }

  if (!params.lineItems || params.lineItems.length === 0) {
    return { error: 'No valid Stripe price IDs provided for selected modules.' }
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://designer.nextqtechs.com'
  const successUrl = params.successUrl || `${siteUrl}/admin?checkout=success&org_id=${params.organizationId}`
  const cancelUrl = params.cancelUrl || `${siteUrl}/admin?checkout=canceled&org_id=${params.organizationId}`

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer: params.customerId || undefined,
      customer_email: !params.customerId ? params.customerEmail : undefined,
      line_items: params.lineItems.map(item => ({
        price: item.priceId,
        quantity: item.quantity || 1,
      })),
      subscription_data: {
        metadata: {
          organization_id: params.organizationId,
          organization_name: params.organizationName,
        },
      },
      metadata: {
        organization_id: params.organizationId,
        organization_name: params.organizationName,
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
      allow_promotion_codes: true,
      billing_address_collection: 'required',
    })

    return { checkoutUrl: session.url || undefined, sessionId: session.id }
  } catch (err: any) {
    console.error('[Stripe] Failed to create checkout session:', err)
    return { error: err.message || 'Failed to create Stripe Checkout session' }
  }
}
