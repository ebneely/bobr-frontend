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

export interface OrderDay {
  id: string;
  /** ISO date. A delivery DAY in Warsaw, not an instant. */
  deliverOn: string;
  eaten: boolean;
  eatenAt: string | null;
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
  createdAt: string;
  days: OrderDay[];
  /** Null on orders placed before addresses were collected. */
  delivery: OrderDelivery | null;
  meal?: { namePl: string; nameEn: string; type: string };
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
}

export function apiPlaceOrder(input: {
  mealId: string;
  mode: OrderMode;
  /** YYYY-MM-DD, one per delivery day. */
  days: string[];
  delivery: DeliveryAddress;
}) {
  return apiFetch<Order>('/orders', { method: 'POST', body: input });
}

export function apiListMyOrders() {
  return apiFetch<Order[]>('/orders');
}

export function apiGetMyOrder(id: string) {
  return apiFetch<Order>(`/orders/${id}`);
}

/** Meal tracking: mark one delivery day eaten, or undo it. */
export function apiTrackDay(dayId: string, eaten: boolean) {
  return apiFetch<OrderDay>(`/orders/days/${dayId}`, {
    method: 'PATCH',
    body: { eaten },
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
