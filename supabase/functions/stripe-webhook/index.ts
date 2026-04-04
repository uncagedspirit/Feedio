/**
 * Supabase Edge Function: stripe-webhook
 *
 * Handles Stripe events and keeps the database in sync with subscription state.
 *
 * Deploy:
 *   supabase functions deploy stripe-webhook
 *
 * In Stripe Dashboard → Webhooks, point to:
 *   https://<your-project>.supabase.co/functions/v1/stripe-webhook
 *
 * Events to listen for:
 *   - checkout.session.completed
 *   - customer.subscription.deleted
 *   - customer.subscription.updated
 *   - invoice.payment_failed
 *
 * Required secrets:
 *   STRIPE_SECRET_KEY
 *   STRIPE_WEBHOOK_SECRET
 *   SUPABASE_SERVICE_ROLE_KEY
 *   SUPABASE_URL
 */
import Stripe from 'https://esm.sh/stripe@14?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2?target=deno'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2024-04-10',
})

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
)

const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? ''

Deno.serve(async (req: Request) => {
  const body      = await req.text()
  const signature = req.headers.get('stripe-signature') ?? ''

  let event: Stripe.Event

  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret)
  } catch (err) {
    console.error('[stripe-webhook] signature verification failed:', err.message)
    return new Response(JSON.stringify({ error: 'Invalid signature' }), { status: 400 })
  }

  try {
    switch (event.type) {
      // ── Payment completed → activate Pro ────────────────────────────────
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        if (session.mode !== 'subscription') break

        const userId         = session.metadata?.supabase_user_id
        const customerId     = session.customer as string
        const subscriptionId = session.subscription as string

        if (!userId) {
          console.error('[stripe-webhook] no supabase_user_id in session metadata')
          break
        }

        await supabase.rpc('upgrade_user_to_pro', {
          p_user_id:               userId,
          p_stripe_customer_id:    customerId,
          p_stripe_subscription_id: subscriptionId,
        })

        console.log(`[stripe-webhook] upgraded user ${userId} to Pro`)
        break
      }

      // ── Subscription cancelled / expired → downgrade to Free ────────────
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        await supabase.rpc('downgrade_user_to_free', {
          p_stripe_subscription_id: sub.id,
        })
        console.log(`[stripe-webhook] downgraded subscription ${sub.id} to Free`)
        break
      }

      // ── Subscription updated (e.g. plan change) ──────────────────────────
      case 'customer.subscription.updated': {
        const sub    = event.data.object as Stripe.Subscription
        const status = sub.status // 'active' | 'past_due' | 'canceled' etc.

        if (status === 'active') {
          // Re-activate if payment recovered
          const customerId = sub.customer as string
          const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('stripe_customer_id', customerId)
            .single()

          if (profile) {
            await supabase.rpc('upgrade_user_to_pro', {
              p_user_id:               profile.id,
              p_stripe_customer_id:    customerId,
              p_stripe_subscription_id: sub.id,
            })
          }
        } else if (status === 'canceled' || status === 'unpaid') {
          await supabase.rpc('downgrade_user_to_free', {
            p_stripe_subscription_id: sub.id,
          })
        }
        break
      }

      // ── Payment failed ────────────────────────────────────────────────────
      case 'invoice.payment_failed': {
        // Optionally notify user via email (Resend / Supabase emails).
        // For now, just log.
        const invoice    = event.data.object as Stripe.Invoice
        const customerId = invoice.customer as string
        console.warn(`[stripe-webhook] payment failed for customer ${customerId}`)
        break
      }

      default:
        console.log(`[stripe-webhook] unhandled event: ${event.type}`)
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[stripe-webhook] handler error:', err)
    return new Response(JSON.stringify({ error: 'Handler error' }), { status: 500 })
  }
})
