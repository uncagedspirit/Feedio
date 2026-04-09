/**
 * payment.js — provider-agnostic payment abstraction layer.
 *
 * All Dodo Payments API calls happen server-side in Supabase Edge Functions.
 * This file only calls those edge functions and redirects to the returned URLs.
 *
 * To switch payment providers in the future, only this file needs to change.
 */
import { supabase } from './supabase'

export const PAYMENT_PROVIDER = 'dodo'

const appUrl = import.meta.env.VITE_APP_URL ?? window.location.origin

/**
 * Opens a Dodo Payments checkout session for the Pro plan.
 *
 * Flow:
 *   1. Calls the Supabase Edge Function `create-checkout`.
 *   2. Edge function creates a Dodo Payments checkout session and returns its URL.
 *   3. We redirect the browser to that URL.
 *   4. On success/cancel, Dodo redirects back to appUrl/dashboard.
 *
 * Returns { error } if something goes wrong, or {} on successful redirect.
 */
export async function openProCheckout() {
  try {
    console.log(`[payment] opening checkout via ${PAYMENT_PROVIDER}`)

    const { data, error } = await supabase.functions.invoke('create-checkout', {
      body: {
        successUrl: `${appUrl}/dashboard?checkout=success`,
        cancelUrl:  `${appUrl}/dashboard?checkout=cancelled`,
      },
    })

    if (error) throw error
    if (!data?.url) throw new Error('No checkout URL returned from edge function')

    window.location.href = data.url
    return {}
  } catch (err) {
    console.error(`[payment] openProCheckout error (${PAYMENT_PROVIDER}):`, err)
    return { error: err.message ?? 'Failed to open checkout' }
  }
}

/**
 * Opens the Dodo Payments billing portal for the current user.
 *
 * Flow:
 *   1. Calls the Supabase Edge Function `billing-portal`.
 *   2. Edge function creates a billing portal session and returns its URL.
 *   3. We redirect the browser to that URL.
 *
 * Returns { error } if something goes wrong, or {} on successful redirect.
 */
export async function openBillingPortal() {
  try {
    console.log(`[payment] opening billing portal via ${PAYMENT_PROVIDER}`)

    const { data, error } = await supabase.functions.invoke('billing-portal', {
      body: {
        returnUrl: `${appUrl}/dashboard`,
      },
    })

    if (error) throw error
    if (!data?.url) throw new Error('No billing portal URL returned from edge function')

    window.location.href = data.url
    return {}
  } catch (err) {
    console.error(`[payment] openBillingPortal error (${PAYMENT_PROVIDER}):`, err)
    return { error: err.message ?? 'Failed to open billing portal' }
  }
}