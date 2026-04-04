import { loadStripe } from '@stripe/stripe-js'
import { supabase } from './supabase'

const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
const proPriceId     = import.meta.env.VITE_STRIPE_PRO_PRICE_ID
const appUrl         = import.meta.env.VITE_APP_URL ?? window.location.origin

/** Lazy-loaded Stripe.js instance */
let stripePromise = null
const getStripe = () => {
  if (!stripePromise && publishableKey) {
    stripePromise = loadStripe(publishableKey)
  }
  return stripePromise
}

/**
 * Opens a Stripe Checkout session for the Pro plan.
 *
 * Flow:
 *   1. Calls the Supabase Edge Function `create-checkout` with the price ID.
 *   2. Edge function creates a Stripe Checkout Session and returns its URL.
 *   3. We redirect to Stripe.
 *   4. On success/cancel, Stripe redirects back to `appUrl/dashboard`.
 *
 * Returns { error } if something goes wrong.
 */
export async function openProCheckout() {
  try {
    const { data, error } = await supabase.functions.invoke('create-checkout', {
      body: {
        priceId:    proPriceId,
        successUrl: `${appUrl}/dashboard?checkout=success`,
        cancelUrl:  `${appUrl}/dashboard?checkout=cancelled`,
      },
    })

    if (error) throw error
    if (!data?.url) throw new Error('No checkout URL returned')

    // Redirect to Stripe Checkout
    window.location.href = data.url
    return {}
  } catch (err) {
    console.error('[stripe] openProCheckout error:', err)
    return { error: err.message ?? 'Failed to open checkout' }
  }
}

export { getStripe }
