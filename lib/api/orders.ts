import { apiFetch } from './client';

/**
 * Orders and the customer's notes.
 *
 * Mirrors `bobr_backend/src/orders/` and `src/notes/`. Note what is NOT sent
 * when placing an order: no price, no discount, no total. The client names a
 * meal and some dates; every figure is computed server-side. Sending a price
 * would let anyone order at any price.
 */

export type OrderMode = 'ONE_TIME' | 'CALENDAR';

export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'DELIVERED'
  | 'CANCELLED';

export type NoteKind = 'NUDGE' | 'COMPLAINT' | 'NOTE';

/** G17 — the delivery day's own lifecycle, independent of the order's. */
export type DeliveryDayStatus = 'SCHEDULED' | 'DELIVERED' | 'FAILED' | 'SKIPPED' | 'CANCELLED';

/** G31 — what happened to a delivered day. `eaten`/`eatenAt` stay for one release. */
export type Consumption = 'UNRECORDED' | 'EATEN' | 'SKIPPED';

export interface OrderDay {
  id: string;
  /** ISO date. A delivery DAY in Warsaw, not an instant. */
  deliverOn: string;
  eaten: boolean;
  eatenAt: string | null;
  status: DeliveryDayStatus;
  consumption: Consumption;
  consumptionNote: string | null;
}

export interface Order {
  id: string;
  mode: OrderMode;
  status: OrderStatus;
  paymentMethod: 'COD';
  /** All money is integer grosze. Divide by 100 only at the point of display. */
  unitPriceGrosze: number;
  goodsGrosze: number;
  discountPercent: number;
  discountGrosze: number;
  shippingGrosze: number;
  totalGrosze: number;
  /** G04 — set once the remaining days are cancelled; read as `adjustedTotalGrosze ?? totalGrosze`. */
  adjustedTotalGrosze: number | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  createdAt: string;
  days: OrderDay[];
  /** Null on orders placed before addresses were collected. */
  delivery: OrderDelivery | null;
  meal?: { namePl: string; nameEn: string; type: string };
  /** G14 — who the courier calls and what to know before knocking. */
  contactPhone: string | null;
  deliveryNotes: string | null;
}

/** The total this order is actually billed for — cancellation may have adjusted it. */
export function effectiveTotalGrosze(order: Pick<Order, 'totalGrosze' | 'adjustedTotalGrosze'>): number {
  return order.adjustedTotalGrosze ?? order.totalGrosze;
}

export interface DeliveryAddress {
  addressLine: string;
  city: string;
  /** NN-NNN */
  postalCode: string;
}

export interface OrderDelivery extends DeliveryAddress {
  zoneId: string;
  zoneNamePl: string;
  zoneNameEn: string;
}

export interface CustomerNote {
  id: string;
  kind: NoteKind;
  body: string;
  adminReply: string | null;
  repliedAt: string | null;
  createdAt: string;
  orderId: string | null;
  /** Included by `GET /notes` when the note is about one of the customer's orders. */
  order?: { id: string; totalGrosze: number } | null;
}

/** Longest note body the server accepts (`RaiseNoteSchema`). */
export const NOTE_BODY_MAX = 2000;

/** The body of both `POST /orders` and `POST /orders/quote`. */
export interface PlaceOrderInput {
  mealId: string;
  mode: OrderMode;
  /** YYYY-MM-DD, one per delivery day. */
  days: string[];
  delivery: DeliveryAddress;
  /** G14 — normalised to +48XXXXXXXXX server-side. */
  contactPhone?: string;
  deliveryNotes?: string;
  /**
   * G38 — generated once per page load with `crypto.randomUUID()`. A repeat
   * (double click, retry after a timeout) returns the SAME order at 200
   * instead of creating a second one.
   */
  clientRequestId?: string;
}

/**
 * What `POST /orders` would charge for a body, from `POST /orders/quote`
 * (gap G03). The same server code path prices both, so these are the figures
 * the placed order freezes. Integer grosze throughout.
 */
export interface OrderQuote {
  mealId: string;
  mode: OrderMode;
  unitPriceGrosze: number;
  goodsGrosze: number;
  discountPercent: number;
  discountGrosze: number;
  shippingGrosze: number;
  totalGrosze: number;
  dayCount: number;
  /** Sorted `YYYY-MM-DD` Warsaw days. */
  deliveryDays: string[];
  firstDeliveryDay: string;
  lastDeliveryDay: string;
  delivery: OrderDelivery;
}

/** The placed order, plus the day summary `POST /orders` adds to its response. */
export type PlacedOrder = Order &
  Pick<OrderQuote, 'dayCount' | 'deliveryDays' | 'firstDeliveryDay' | 'lastDeliveryDay'>;

export function apiPlaceOrder(input: PlaceOrderInput) {
  return apiFetch<PlacedOrder>('/orders', { method: 'POST', body: input });
}

/** Prices the body without writing anything. Refuses exactly like placing. */
export function apiQuoteOrder(input: PlaceOrderInput, signal?: AbortSignal) {
  return apiFetch<OrderQuote>('/orders/quote', { method: 'POST', body: input, signal });
}

export function apiListMyOrders() {
  return apiFetch<Order[]>('/orders');
}

export function apiGetMyOrder(id: string) {
  return apiFetch<Order>(`/orders/${id}`);
}

/** G31 — records what happened to a delivered day: eaten, skipped, or cleared back to unrecorded. */
export function apiTrackDay(dayId: string, consumption: Consumption, note?: string | null) {
  return apiFetch<OrderDay>(`/orders/days/${dayId}`, {
    method: 'PATCH',
    body: { consumption, note: note ?? undefined },
  });
}

/** G19 — pauses one SCHEDULED day; it moves to the end of the plan. Returns the whole order. */
export function apiSkipDay(orderId: string, dayId: string) {
  return apiFetch<Order>(`/orders/${orderId}/days/${dayId}/skip`, { method: 'POST' });
}

/** G19 — moves one SCHEDULED day to a different date. `to` is `YYYY-MM-DD`. */
export function apiMoveDay(orderId: string, dayId: string, to: string) {
  return apiFetch<Order>(`/orders/${orderId}/days/${dayId}/move`, {
    method: 'PATCH',
    body: { to },
  });
}

/** G19 / G04 — cancels the remaining SCHEDULED days of an order. */
export function apiCancelOrder(orderId: string, reason: string) {
  return apiFetch<Order>(`/orders/${orderId}/cancel`, {
    method: 'POST',
    body: { reason },
  });
}

export function apiRaiseNote(input: {
  kind: NoteKind;
  body: string;
  orderId?: string | null;
}) {
  return apiFetch<CustomerNote>('/notes', { method: 'POST', body: input });
}

export function apiListMyNotes() {
  return apiFetch<CustomerNote[]>('/notes');
}

/**
 * Formats grosze as PLN.
 *
 * The ONLY place integer grosze become a decimal, and it happens at display
 * time. Dividing earlier puts a float into the arithmetic, and float money is
 * wrong in the third decimal place where nobody looks.
 */
export function formatGrosze(grosze: number, locale: string): string {
  return new Intl.NumberFormat(locale === 'pl' ? 'pl-PL' : 'en-GB', {
    style: 'currency',
    currency: 'PLN',
  }).format(grosze / 100);
}
