import { apiFetch } from './client';

/**
 * Settings the storefront reads. Mirrors `bobr_backend/src/settings/`.
 *
 * Delivery prices are no longer read from here — they come from the delivery
 * zone the postal code resolves to (`lib/api/delivery-zones.ts`).
 */

export interface PaymentSettings {
  /** Normalised `+48XXXXXXXXX`, or null until the admin enters one. */
  blikPhone: string | null;
  blikRecipientName: string | null;
}

/** Signed in, any role. */
export function apiGetPaymentSettings() {
  return apiFetch<PaymentSettings>('/settings/payment');
}
