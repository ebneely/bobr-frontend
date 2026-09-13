import { apiFetch } from './client';

/**
 * Public settings. Mirrors `bobr_backend/src/settings/`.
 *
 * Shipping is shown to the customer for information only — the server still
 * prices the order and freezes the shipping it charged on the order row.
 */

export interface ShippingSettings {
  /** Integer grosze charged once on a ONE_TIME order. Calendar orders ship free. */
  oneTimeShippingGrosze: number;
}

export function apiGetShipping() {
  return apiFetch<ShippingSettings>('/settings/shipping', { auth: false });
}
