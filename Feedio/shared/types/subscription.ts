/**
 * subscription.ts — shared TypeScript enums used across services and the web app.
 *
 * Import from this file instead of using raw strings so that any rename is
 * caught at compile time across the entire monorepo.
 */

/**
 * The lifecycle state of a user's subscription.
 * Stored in profiles.subscription_state.
 */
export enum SubscriptionState {
  Free             = 'free',
  Active           = 'active',
  CancelScheduled  = 'cancel_scheduled',
  InGrace          = 'in_grace',
  Expired          = 'expired',
}

/**
 * All transactional email types sent by the send-email edge function.
 * Must stay in sync with the switch statement in services/email/send-email/index.ts.
 */
export enum EmailType {
  Welcome               = 'welcome',
  PaymentFailed         = 'payment_failed',
  CancellationConfirmed = 'cancellation_confirmed',
  GraceDay5             = 'grace_day5',
  GraceDay7             = 'grace_day7',
  Downgraded            = 'downgraded',
  InactiveWarning       = 'inactive_warning',
  DeletionWarning       = 'deletion_warning',
  Reactivation          = 'reactivation',
}

/**
 * Supported payment providers.
 * Add more values here when switching or adding providers.
 */
export enum PaymentProvider {
  Dodo = 'dodo', // add more here when switching providers
}

/**
 * Available subscription plans.
 */
export enum PlanName {
  Free = 'free',
  Pro  = 'pro',
}