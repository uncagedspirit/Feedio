/**
 * api.js — centralised wrapper for all Supabase Edge Function invocations.
 *
 * Import this module wherever you need to call an edge function.
 * Never call supabase.functions.invoke() directly from components or context —
 * always go through these exports so call sites stay thin and easy to update.
 */
import { supabase } from './supabase'

/**
 * Calls the enforce-access edge function.
 * Reconciles the user's subscription state after login or checkout redirect.
 *
 * @returns {{ data: { subscription_state: string } | null, error: Error | null }}
 */
export async function invokeEnforceAccess() {
  try {
    const { data, error } = await supabase.functions.invoke('enforce-access')
    if (error) {
      console.error('[api] invokeEnforceAccess error:', error.message ?? error)
      return { data: null, error }
    }
    return { data, error: null }
  } catch (err) {
    console.error('[api] invokeEnforceAccess unexpected error:', err)
    return { data: null, error: err }
  }
}

/**
 * Calls the create-checkout edge function.
 * Returns a Dodo Payments checkout URL the browser should redirect to.
 *
 * @param {{ successUrl: string, cancelUrl: string }} body
 * @returns {{ data: { url: string } | null, error: Error | null }}
 */
export async function invokeCreateCheckout(body) {
  try {
    const { data, error } = await supabase.functions.invoke('create-checkout', { body })
    if (error) {
      console.error('[api] invokeCreateCheckout error:', error.message ?? error)
      return { data: null, error }
    }
    return { data, error: null }
  } catch (err) {
    console.error('[api] invokeCreateCheckout unexpected error:', err)
    return { data: null, error: err }
  }
}

/**
 * Calls the billing-portal edge function.
 * Returns a Dodo Payments billing portal URL the browser should redirect to.
 *
 * @param {{ returnUrl: string }} body
 * @returns {{ data: { url: string } | null, error: Error | null }}
 */
export async function invokeBillingPortal(body) {
  try {
    const { data, error } = await supabase.functions.invoke('billing-portal', { body })
    if (error) {
      console.error('[api] invokeBillingPortal error:', error.message ?? error)
      return { data: null, error }
    }
    return { data, error: null }
  } catch (err) {
    console.error('[api] invokeBillingPortal unexpected error:', err)
    return { data: null, error: err }
  }
}

/**
 * Calls the send-email edge function.
 *
 * ⚠️  INTERNAL USE ONLY — this function must NOT be called from the frontend
 * in production. It is guarded server-side by an x-internal-secret header.
 * This export exists solely for local development tooling and admin scripts.
 * In production, emails are queued via email_log and dispatched by the cron job.
 *
 * @param {{ user_id: string, email_type: string, idempotency_key: string }} body
 * @returns {{ data: unknown | null, error: Error | null }}
 */
export async function invokeSendEmail(body) {
  try {
    const { data, error } = await supabase.functions.invoke('send-email', { body })
    if (error) {
      console.error('[api] invokeSendEmail error:', error.message ?? error)
      return { data: null, error }
    }
    return { data, error: null }
  } catch (err) {
    console.error('[api] invokeSendEmail unexpected error:', err)
    return { data: null, error: err }
  }
}

/**
 * Redeems a magic trial link token for the authenticated user.
 *
 * @param {string} token — the slug from the URL
 * @returns {{ data: { ok: boolean, trial_days: number, ends_at: string } | null, error: Error | null }}
 */
export async function invokeRedeemTrial(token) {
  try {
    const { data, error } = await supabase.functions.invoke('redeem-trial', {
      body: { token },
    })
    if (error) {
      console.error('[api] invokeRedeemTrial error:', error.message ?? error)
      return { data: null, error }
    }
    return { data, error: null }
  } catch (err) {
    console.error('[api] invokeRedeemTrial unexpected error:', err)
    return { data: null, error: err }
  }
}

/**
 * Calls the admin-api edge function.
 * Only works for users whose ID is in the ADMIN_USER_IDS Supabase secret.
 *
 * @param {string} action — the admin action to perform
 * @param {Record<string, unknown>} params — action-specific parameters
 * @returns {{ data: unknown | null, error: Error | null }}
 */
export async function invokeAdminApi(action, params = {}) {
  try {
    const { data, error } = await supabase.functions.invoke('admin-api', {
      body: { action, ...params },
    })
    if (error) {
      console.error('[api] invokeAdminApi error:', error.message ?? error)
      return { data: null, error }
    }
    return { data, error: null }
  } catch (err) {
    console.error('[api] invokeAdminApi unexpected error:', err)
    return { data: null, error: err }
  }
}