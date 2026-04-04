/**
 * Supabase Edge Function: create-checkout
 *
 * Creates a Stripe Checkout Session for the Pro plan and returns its URL.
 *
 * Deploy:
 *   supabase functions deploy create-checkout
 *
 * Required secrets (set via Supabase Dashboard → Edge Functions → Secrets):
 *   STRIPE_SECRET_KEY
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

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // 1. Authenticate the requesting user
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return json({ error: 'Unauthorized' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )
    if (authError || !user) {
      return json({ error: 'Invalid token' }, 401)
    }

    // 2. Get or create Stripe customer for this user
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id, name, plan')
      .eq('id', user.id)
      .single()

    if (profile?.plan === 'pro') {
      return json({ error: 'Already on Pro plan' }, 400)
    }

    let customerId = profile?.stripe_customer_id

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name:  profile?.name ?? user.email,
        metadata: { supabase_user_id: user.id },
      })
      customerId = customer.id

      // Store the customer ID so we don't create duplicates
      await supabase
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id)
    }

    // 3. Parse request body
    const { priceId, successUrl, cancelUrl } = await req.json()

    if (!priceId) {
      return json({ error: 'priceId is required' }, 400)
    }

    // 4. Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer:             customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price:    priceId,
          quantity: 1,
        },
      ],
      mode:        'subscription',
      success_url: successUrl,
      cancel_url:  cancelUrl,
      metadata: {
        supabase_user_id: user.id,
      },
      subscription_data: {
        metadata: { supabase_user_id: user.id },
      },
    })

    return json({ url: session.url })
  } catch (err) {
    console.error('[create-checkout] error:', err)
    return json({ error: err.message ?? 'Internal server error' }, 500)
  }
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
