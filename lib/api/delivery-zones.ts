import { apiFetch } from './client';

/**
 * Delivery zones. Mirrors `bobr_backend/src/delivery-zones/`.
 *
 * The quote is informational: it tells the customer whether we deliver to a
 * postal code and what one-time delivery costs there. The server resolves the
 * zone again when the order is placed and freezes the price on the order.
 */

export interface ZoneQuote {
  zoneId: string;
  namePl: string;
  nameEn: string;
  /** Integer grosze charged once on a ONE_TIME order. Calendar orders ship free. */
  oneTimeShippingGrosze: number;
}

/** 200 → the zone; 404 → not delivered there; 422 → not NN-NNN. */
export function apiQuoteZone(postalCode: string, signal?: AbortSignal) {
  return apiFetch<ZoneQuote>(
    `/delivery-zones/quote?postalCode=${encodeURIComponent(postalCode)}`,
    { auth: false, signal },
  );
}
