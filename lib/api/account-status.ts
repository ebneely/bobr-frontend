import type { Consultation, ConsultationStatus } from './consultations';
import type { IntakeProfile } from './intake';
import type { CustomerNote, Order, OrderStatus } from './orders';
import { WARSAW } from '@/lib/dates';

/**
 * How the account area reads the rows the API already returns.
 *
 * Pure functions, so the rules that decide what a customer is TOLD — which
 * order is "active", when a Meet link may be shown, whether a consultation
 * still needs paying — are unit-tested rather than scattered through JSX. None
 * of them invents business rules: they only classify fields the server set.
 */

/** The visual family of a status badge. Mapped to colours in account.css. */
export type StatusTone = 'waiting' | 'ok' | 'active' | 'done' | 'off' | 'alert';

const ORDER_TONE: Record<OrderStatus, StatusTone> = {
  PENDING: 'waiting',
  CONFIRMED: 'ok',
  PROCESSING: 'active',
  DELIVERED: 'done',
  CANCELLED: 'off',
};

const CONSULTATION_TONE: Record<ConsultationStatus, StatusTone> = {
  REQUESTED: 'waiting',
  CONFIRMED: 'ok',
  COMPLETED: 'done',
  CANCELLED: 'off',
};

export function orderStatusTone(status: OrderStatus): StatusTone {
  return ORDER_TONE[status] ?? 'waiting';
}

export function consultationStatusTone(status: ConsultationStatus): StatusTone {
  return CONSULTATION_TONE[status] ?? 'waiting';
}

/** Orders that can still deliver something. */
export function isOrderLive(order: Pick<Order, 'status'>): boolean {
  return order.status !== 'CANCELLED' && order.status !== 'DELIVERED';
}

/**
 * The Warsaw calendar day of an order day.
 *
 * `deliverOn` is a Postgres DATE, which the API serialises as UTC midnight
 * (`2026-09-20T00:00:00.000Z`). The date part IS the day; converting it through
 * any time zone would move it. A bare `YYYY-MM-DD` is accepted too.
 */
export function orderDayKey(deliverOn: string): string {
  return deliverOn.slice(0, 10);
}

export type DayTiming = 'past' | 'today' | 'upcoming';

/** Where a delivery day sits relative to Warsaw today (`YYYY-MM-DD`). */
export function dayTiming(deliverOn: string, today: string): DayTiming {
  const key = orderDayKey(deliverOn);
  if (key < today) return 'past';
  if (key === today) return 'today';
  return 'upcoming';
}

export interface NextDelivery {
  order: Order;
  /** `YYYY-MM-DD`, a Warsaw day. */
  day: string;
}

/**
 * The soonest delivery day, today included, across orders that are still live.
 * Null when nothing is scheduled.
 */
export function nextDelivery(orders: Order[], today: string): NextDelivery | null {
  let best: NextDelivery | null = null;
  for (const order of orders) {
    if (!isOrderLive(order)) continue;
    for (const d of order.days) {
      // A skipped or cancelled day is not a delivery, even if its date is ahead.
      if (d.status && d.status !== 'SCHEDULED') continue;
      const key = orderDayKey(d.deliverOn);
      if (key < today) continue;
      if (!best || key < best.day) best = { order, day: key };
    }
  }
  return best;
}

/** Scheduled days of one order still ahead of (or on) Warsaw today. */
export function remainingDays(order: Pick<Order, 'days'>, today: string): number {
  return order.days.filter(
    (d) => (!d.status || d.status === 'SCHEDULED') && orderDayKey(d.deliverOn) >= today,
  ).length;
}

/**
 * Days the order was priced for. A skip moves a delivery to the end of the plan
 * by adding a new day and marking the old one SKIPPED, so counting rows would
 * show 6 days next to a 5-day price. Cancelled days stay: they were priced, and
 * the adjusted total says what is actually owed.
 */
export function pricedDayCount(order: Pick<Order, 'days'>): number {
  return order.days.filter((d) => d.status !== 'SKIPPED').length;
}

/** First and last delivery day of an order, or null for an order with none. */
export function orderDayRange(order: Pick<Order, 'days'>): { first: string; last: string } | null {
  if (order.days.length === 0) return null;
  const keys = order.days.map((d) => orderDayKey(d.deliverOn)).sort();
  return { first: keys[0], last: keys[keys.length - 1] };
}

/** The most recently placed order. */
export function latestOrder(orders: Order[]): Order | null {
  let best: Order | null = null;
  for (const o of orders) if (!best || o.createdAt > best.createdAt) best = o;
  return best;
}

// --- Consultations ---------------------------------------------------------

export type PaymentState = 'paid' | 'unpaid' | 'notDue';

/**
 * Whether a consultation still needs paying.
 *
 * `paidAt` is set by the admin once the BLIK transfer arrives, independent of
 * the status. A cancelled booking that was never paid is not "unpaid" — there
 * is nothing to pay — so it is not flagged.
 */
export function consultationPayment(c: Pick<Consultation, 'paidAt' | 'status'>): PaymentState {
  if (c.paidAt) return 'paid';
  if (c.status === 'CANCELLED') return 'notDue';
  return 'unpaid';
}

const MEET_URL = /^https:\/\/meet\.google\.com\/[A-Za-z0-9-]+$/;

/**
 * The Meet link, only once the doctor has CONFIRMED the slot. A link on any
 * other status is withheld: before confirmation there is none, and after the
 * call or a cancellation it no longer leads anywhere useful.
 */
export function joinableMeetUrl(c: Pick<Consultation, 'status' | 'meetUrl'>): string | null {
  if (c.status !== 'CONFIRMED' || !c.meetUrl) return null;
  return MEET_URL.test(c.meetUrl) ? c.meetUrl : null;
}

/** The time to show: the confirmed slot, or the customer's own preference until then. */
export function consultationWhen(
  c: Pick<Consultation, 'scheduledAt' | 'preferredAt'>,
): { at: string; confirmed: boolean } {
  return c.scheduledAt
    ? { at: c.scheduledAt, confirmed: true }
    : { at: c.preferredAt, confirmed: false };
}

/** How long after its start a call still counts as "upcoming". */
const CALL_GRACE_MS = 60 * 60 * 1000;

/**
 * The next consultation to show on the overview: REQUESTED or CONFIRMED, not
 * more than an hour past its time, soonest first.
 */
export function upcomingConsultation(list: Consultation[], now: Date): Consultation | null {
  const floor = now.getTime() - CALL_GRACE_MS;
  const open = list
    .filter((c) => c.status === 'REQUESTED' || c.status === 'CONFIRMED')
    .map((c) => ({ c, t: new Date(consultationWhen(c).at).getTime() }))
    .filter(({ t }) => t >= floor)
    .sort((a, b) => a.t - b.t);
  return open[0]?.c ?? null;
}

/** Consultations still waiting for a transfer. */
export function unpaidConsultations(list: Consultation[]): Consultation[] {
  return list.filter((c) => consultationPayment(c) === 'unpaid');
}

// --- Notes -----------------------------------------------------------------

export type NoteState = 'answered' | 'awaiting';

export function noteState(note: Pick<CustomerNote, 'repliedAt' | 'adminReply'>): NoteState {
  return note.repliedAt && note.adminReply ? 'answered' : 'awaiting';
}

/** Awaiting a reply first, then newest — what a customer checks for. */
export function sortNotes<T extends Pick<CustomerNote, 'repliedAt' | 'adminReply' | 'createdAt'>>(
  notes: T[],
): T[] {
  return [...notes].sort((a, b) => {
    const sa = noteState(a) === 'awaiting' ? 0 : 1;
    const sb = noteState(b) === 'awaiting' ? 0 : 1;
    if (sa !== sb) return sa - sb;
    return a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0;
  });
}

// --- Intake ----------------------------------------------------------------

export type IntakeState = 'missing' | 'incomplete' | 'complete';

/** `null` is "no profile yet" — the API's 404. */
export function intakeState(profile: Pick<IntakeProfile, 'completedAt'> | null): IntakeState {
  if (!profile) return 'missing';
  return profile.completedAt ? 'complete' : 'incomplete';
}

// --- Formatting --------------------------------------------------------------

function intlLocale(locale: string): string {
  return locale === 'pl' ? 'pl-PL' : 'en-GB';
}

/** An instant as a Warsaw date and time, e.g. "wtorek, 22 września 2026, 10:00". */
export function formatWarsawDateTime(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    timeZone: WARSAW,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

/** An instant as a short Warsaw date, e.g. "15 wrz 2026". */
export function formatWarsawDate(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    timeZone: WARSAW,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(iso));
}

/**
 * Grosze as the bare number a banking app's amount field takes ("100,00"),
 * without a currency sign. Integer arithmetic only — no division into a float.
 */
export function plainAmount(grosze: number, locale: string): string {
  const sign = grosze < 0 ? '-' : '';
  const abs = Math.abs(Math.trunc(grosze));
  const zloty = Math.trunc(abs / 100);
  const rest = String(abs % 100).padStart(2, '0');
  return `${sign}${zloty}${locale === 'pl' ? ',' : '.'}${rest}`;
}

/** The first 8 characters of an id, upper-case — a short order number to quote. */
export function shortId(id: string): string {
  return id.replace(/-/g, '').slice(0, 8).toUpperCase();
}
