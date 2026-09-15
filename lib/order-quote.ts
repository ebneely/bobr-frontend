import { ApiError, type ApiErrorBody } from '@/lib/api/client';
import type { OrderMode, OrderQuote, PlaceOrderInput } from '@/lib/api/orders';
import { validateAddress } from '@/lib/delivery';

/**
 * How the order page turns what the customer picked into a quote request, and
 * the quote's answer into what the summary box shows.
 *
 * Pure, so the rules that decide whether the "order with obligation to pay"
 * button may be pressed are unit-tested rather than buried in JSX. Nothing here
 * prices anything: every figure comes from `POST /v1/orders/quote`, which runs
 * the same code as placing the order (G03). The only rules repeated are the
 * ones that decide whether asking the server is worth it at all.
 */

/** Matches the server (`MIN_CALENDAR_DAYS`). */
export const MIN_CALENDAR_DAYS = 5;

/** Why there is nothing to quote yet, in the order the page asks for things. */
export type QuoteMissing = 'meal' | 'days' | 'minDays' | 'address';

export interface OrderDraft {
  mealId: string | null;
  mode: OrderMode;
  days: Iterable<string>;
  addressLine: string;
  city: string;
  postalCode: string;
}

export type QuoteRequest =
  | { ready: true; input: PlaceOrderInput; key: string }
  | { ready: false; missing: QuoteMissing };

/**
 * The body to quote (and later place), or what is still missing. Days are
 * sorted and the address trimmed, so two drafts that mean the same order get
 * the same key and share one cached quote.
 */
export function buildQuoteRequest(draft: OrderDraft): QuoteRequest {
  if (!draft.mealId) return { ready: false, missing: 'meal' };
  const days = [...new Set(draft.days)].sort();
  if (days.length === 0) return { ready: false, missing: 'days' };
  if (draft.mode === 'CALENDAR' && days.length < MIN_CALENDAR_DAYS) {
    return { ready: false, missing: 'minDays' };
  }
  if (Object.keys(validateAddress(draft)).length > 0) {
    return { ready: false, missing: 'address' };
  }
  const input: PlaceOrderInput = {
    mealId: draft.mealId,
    mode: draft.mode,
    // One-time is exactly one delivery; the page single-selects, and a stray
    // second day would only earn a 422.
    days: draft.mode === 'ONE_TIME' ? days.slice(0, 1) : days,
    delivery: {
      addressLine: draft.addressLine.trim(),
      city: draft.city.trim(),
      postalCode: draft.postalCode.trim(),
    },
  };
  return { ready: true, input, key: quoteKey(input) };
}

/** A stable identity for a request body — the React Query key part. */
export function quoteKey(input: PlaceOrderInput): string {
  return JSON.stringify([
    input.mealId,
    input.mode,
    input.days,
    input.delivery.addressLine,
    input.delivery.city,
    input.delivery.postalCode,
  ]);
}

/** A refusal the page answers with something other than a line of text. */
export type QuoteRefusal =
  | { kind: 'signedOut' }
  | { kind: 'intake' }
  | { kind: 'notDelivered' }
  | { kind: 'other'; body: ApiErrorBody | null };

/** Sorts a quote (or place) failure into what the page does about it. */
export function classifyQuoteError(error: unknown): QuoteRefusal {
  if (!(error instanceof ApiError)) return { kind: 'other', body: null };
  if (error.status === 401) return { kind: 'signedOut' };
  // The intake gate. An older backend sends a 403 with no code; it is still the gate.
  if (error.status === 403 && (!error.body?.code || error.body.code === 'INTAKE_INCOMPLETE')) {
    return { kind: 'intake' };
  }
  const message = error.body?.message;
  if (
    error.status === 422 &&
    Array.isArray(message) &&
    message.some((m) => typeof m !== 'string' && m.field === 'delivery.postalCode')
  ) {
    return { kind: 'notDelivered' };
  }
  return { kind: 'other', body: error.body };
}

/** What the summary box shows. */
export type SummaryState =
  | { state: 'incomplete'; missing: QuoteMissing }
  | { state: 'loading' }
  /** `fresh` is false while an older quote is on screen and the new one is on its way. */
  | { state: 'ready'; quote: OrderQuote; fresh: boolean }
  | { state: 'refused'; refusal: QuoteRefusal };

export interface QuoteQueryView {
  /** The key the query last asked about (the debounced request). */
  key: string | null;
  data: OrderQuote | undefined;
  error: unknown;
  /** React Query's `isPlaceholderData`: `data` belongs to an earlier key. */
  isPlaceholderData: boolean;
  isFetching: boolean;
}

/**
 * Combines the current request with the query's state.
 *
 * A quote only counts as fresh when it answers the request as it is NOW — the
 * customer may have ticked another day while the answer was travelling, and a
 * total for yesterday's selection must not sit next to the pay button looking
 * current.
 */
export function summaryState(request: QuoteRequest, query: QuoteQueryView): SummaryState {
  if (!request.ready) return { state: 'incomplete', missing: request.missing };
  const settled = query.key === request.key && !query.isFetching;
  if (query.error && settled) {
    return { state: 'refused', refusal: classifyQuoteError(query.error) };
  }
  if (query.data) {
    const fresh = settled && !query.isPlaceholderData && !query.error;
    return { state: 'ready', quote: query.data, fresh };
  }
  return { state: 'loading' };
}

/** The button commits the customer to pay, so only a fresh total lets it through. */
export function canPlaceOrder(summary: SummaryState): boolean {
  return summary.state === 'ready' && summary.fresh;
}

/** The money lines of a quote or a placed order, in the order they are shown. */
export interface Breakdown {
  unitPriceGrosze: number;
  dayCount: number;
  goodsGrosze: number;
  discountPercent: number;
  discountGrosze: number;
  shippingGrosze: number;
  totalGrosze: number;
}

/** The same breakdown whether it came from the quote or from the placed order. */
export function breakdownOf(
  source: Omit<Breakdown, 'dayCount'> & { dayCount?: number; days?: unknown[] },
): Breakdown {
  return {
    unitPriceGrosze: source.unitPriceGrosze,
    dayCount: source.dayCount ?? source.days?.length ?? 0,
    goodsGrosze: source.goodsGrosze,
    discountPercent: source.discountPercent,
    discountGrosze: source.discountGrosze,
    shippingGrosze: source.shippingGrosze,
    totalGrosze: source.totalGrosze,
  };
}
