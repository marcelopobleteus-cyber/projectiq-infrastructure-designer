import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getStripe } from '@/utils/stripe'
import { Database } from '@/types/supabase'

export async function POST(request: Request) {
  const stripe = getStripe()
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!stripe || !webhookSecret) {
    console.warn('[Stripe Webhook] Stripe or STRIPE_WEBHOOK_SECRET is not configured.')
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 400 })
  }

  const signature = request.headers.get('stripe-signature')
  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
  }

  const rawBody = await request.text()
  let event: any

  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
  } catch (err: any) {
    console.error('[Stripe Webhook Signature Verification Failed]:', err.message)
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const supabase = createClient<Database>(supabaseUrl, supabaseKey)

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object
        const orgId = session.metadata?.organization_id
        const customerId = session.customer as string | undefined
        const subscriptionId = session.subscription as string | undefined

        let targetOrgId = orgId

        if (!targetOrgId && customerId) {
          const { data: org } = await supabase
            .from('organizations')
            .select('id')
            .eq('stripe_customer_id', customerId)
            .single()
          if (org) targetOrgId = org.id
        }

        if (targetOrgId) {
          await supabase
            .from('organizations')
            .update({
              billing_status: 'active',
              stripe_subscription_id: subscriptionId || null,
              stripe_customer_id: customerId || null,
            })
            .eq('id', targetOrgId)

          await supabase.from('activity_log').insert({
            organization_id: targetOrgId,
            actor_id: null,
            action: 'billing.subscription_started',
            entity_type: 'organizations',
            entity_id: targetOrgId,
            metadata: {
              session_id: session.id,
              subscription_id: subscriptionId,
              customer_id: customerId,
            },
          })
        }
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object
        const customerId = subscription.customer as string
        const subscriptionId = subscription.id
        const stripeStatus = subscription.status

        let mappedStatus: 'active' | 'past_due' | 'canceled' | 'trialing' = 'active'
        if (stripeStatus === 'active') mappedStatus = 'active'
        else if (stripeStatus === 'trialing') mappedStatus = 'trialing'
        else if (stripeStatus === 'past_due' || stripeStatus === 'unpaid') mappedStatus = 'past_due'
        else if (stripeStatus === 'canceled' || stripeStatus === 'incomplete_expired') mappedStatus = 'canceled'

        const currentPeriodEnd = subscription.current_period_end
          ? new Date(subscription.current_period_end * 1000).toISOString()
          : null

        const { data: org } = await supabase
          .from('organizations')
          .select('id')
          .or(`stripe_subscription_id.eq.${subscriptionId},stripe_customer_id.eq.${customerId}`)
          .single()

        if (org) {
          await supabase
            .from('organizations')
            .update({
              billing_status: mappedStatus,
              stripe_subscription_id: subscriptionId,
              current_period_end: currentPeriodEnd,
            })
            .eq('id', org.id)

          await supabase.from('activity_log').insert({
            organization_id: org.id,
            actor_id: null,
            action: 'billing.subscription_updated',
            entity_type: 'organizations',
            entity_id: org.id,
            metadata: {
              stripe_status: stripeStatus,
              mapped_status: mappedStatus,
              current_period_end: currentPeriodEnd,
            },
          })
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object
        const customerId = subscription.customer as string
        const subscriptionId = subscription.id

        const { data: org } = await supabase
          .from('organizations')
          .select('id')
          .or(`stripe_subscription_id.eq.${subscriptionId},stripe_customer_id.eq.${customerId}`)
          .single()

        if (org) {
          await supabase
            .from('organizations')
            .update({
              billing_status: 'canceled',
            })
            .eq('id', org.id)

          await supabase.from('activity_log').insert({
            organization_id: org.id,
            actor_id: null,
            action: 'billing.subscription_canceled',
            entity_type: 'organizations',
            entity_id: org.id,
            metadata: {
              subscription_id: subscriptionId,
            },
          })
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object
        const customerId = invoice.customer as string
        const subscriptionId = invoice.subscription as string | undefined

        const { data: org } = await supabase
          .from('organizations')
          .select('id')
          .or(`stripe_customer_id.eq.${customerId}${subscriptionId ? `,stripe_subscription_id.eq.${subscriptionId}` : ''}`)
          .single()

        if (org) {
          await supabase
            .from('organizations')
            .update({
              billing_status: 'past_due',
            })
            .eq('id', org.id)

          await supabase.from('activity_log').insert({
            organization_id: org.id,
            actor_id: null,
            action: 'billing.payment_failed',
            entity_type: 'organizations',
            entity_id: org.id,
            metadata: {
              invoice_id: invoice.id,
              attempt_count: invoice.attempt_count,
              amount_due: invoice.amount_due,
            },
          })
        }
        break
      }

      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (err: any) {
    console.error('[Stripe Webhook Handler Error]:', err)
    return NextResponse.json({ error: 'Webhook processing error' }, { status: 500 })
  }
}
