import { earliestDeliveryDay } from '@/lib/dates';
import type { Order, OrderDay } from './orders';

/**
 * G19 — which delivery-day actions the storefront may offer, and when.
 *
 * Mirrors the backend exactly (`canChangeDay` in
 * `bobr_backend/src/orders/checkout-pricing.ts`): a day may be skipped or
 * moved only up to the SAME lead time ordering itself uses. Pure and
 * unit-tested so the deadline rule lives in one place, not scattered through
 * button `disabled` props.
 */

/** A `YYYY-MM-DD` day, from either a bare string or an ISO instant. */
function dayKey(deliverOn: string): string {
  return deliverOn.slice(0, 10);
}

/** Whether a SCHEDULED day at `deliverOnDay` may still be skipped or moved. */
export function canChangeScheduledDay(deliverOnDay: string, now: Date = new Date()): boolean {
  return dayKey(deliverOnDay) >= earliestDeliveryDay(now);
}

export interface DayActions {
  /** Meal tracking (eaten / skipped) — any non-cancelled day at or before today. */
  canTrack: boolean;
  /** G19 — pause this day; it moves to the end of the plan. */
  canSkip: boolean;
  /** G19 — move this day to a different date. */
  canMove: boolean;
}

/**
 * `today` is the Warsaw `YYYY-MM-DD` the page is rendering for
 * (`todayInWarsaw()`), so this never depends on the browser's own clock zone.
 */
export function dayActions(
  day: Pick<OrderDay, 'deliverOn' | 'status'>,
  today: string,
  now: Date = new Date(),
): DayActions {
  if (day.status === 'CANCELLED') {
    return { canTrack: false, canSkip: false, canMove: false };
  }

  const key = dayKey(day.deliverOn);
  const isPastOrToday = key <= today;
  const canChange = day.status === 'SCHEDULED' && !isPastOrToday && canChangeScheduledDay(key, now);

  return {
    // The backend refuses tracking a day that has not happened yet, and one
    // that is CANCELLED — checked above. Everything else past or today is
    // trackable, whatever its DeliveryDayStatus (DELIVERED/FAILED/SCHEDULED).
    canTrack: isPastOrToday,
    canSkip: canChange,
    canMove: canChange,
  };
}

/**
 * "Cancel the remaining days" is offered only when there is at least one
 * SCHEDULED day left and EVERY one of them is still outside the lead-time
 * deadline — exactly the rule `OrdersService.cancelOrder` enforces.
 */
export function canCancelRemaining(
  order: Pick<Order, 'status' | 'days'>,
  now: Date = new Date(),
): boolean {
  if (order.status === 'CANCELLED') return false;
  const scheduled = order.days.filter((d) => d.status === 'SCHEDULED');
  if (scheduled.length === 0) return false;
  return scheduled.every((d) => canChangeScheduledDay(d.deliverOn, now));
}
