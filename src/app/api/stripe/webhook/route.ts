import { NextResponse } from 'next/server'
import { getStripe } from '@/utils/stripe'
import { createAdminClient } from '@/utils/supabase/admin'

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

  // Use the admin client (service_role) to bypass RLS for server-to-server webhook execution
  const supabase = createAdminClient()

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
          // 1. Update organization billing status
          await supabase
            .from('organizations')
            .update({
              billing_status: 'active',
              stripe_subscription_id: subscriptionId || null,
              stripe_customer_id: customerId || null,
            })
            .eq('id', targetOrgId)

          // 2. Activate purchased organization modules
          await supabase
            .from('organization_modules')
            .update({
              status: 'active',
            })
            .eq('organization_id', targetOrgId)

          // 3. Log audit event
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

          console.log(`[Stripe Webhook] Activated organization ${targetOrgId} from checkout session ${session.id}`)
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

          if (mappedStatus === 'canceled') {
            await supabase
              .from('organization_modules')
              .update({ status: 'canceled' })
              .eq('organization_id', org.id)
          }

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

          console.log(`[Stripe Webhook] Updated organization ${org.id} to billing_status=${mappedStatus}`)
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

          await supabase
            .from('organization_modules')
            .update({
              status: 'canceled',
            })
            .eq('organization_id', org.id)

          await supabase.from('activity_log').insert({
            organization_id: org.id,
            actor_id: null,
            action: 'billing.subscription_canceled',
            entity_type: 'organizations',
            entity_id: org.id,
            metadata: {
              subscription_id: subscriptionId,
              customer_id: customerId,
            },
          })

          console.log(`[Stripe Webhook] Canceled organization ${org.id} subscription ${subscriptionId}`)
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

          console.log(`[Stripe Webhook] Set organization ${org.id} to past_due from failed invoice ${invoice.id}`)
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
