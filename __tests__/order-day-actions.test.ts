import { canCancelRemaining, canChangeScheduledDay, dayActions } from '@/lib/api/order-day-actions';
import type { Order, OrderDay } from '@/lib/api/orders';

// Fixed "now": Warsaw 2026-09-15T10:00 CEST → earliest changeable day is
// 2026-09-17 (lead time 2 days), matching `earliestDeliveryDay` in lib/dates.
const NOW = new Date('2026-09-15T08:00:00.000Z');
const TODAY = '2026-09-15';

function day(partial: Partial<OrderDay> & { deliverOn: string }): OrderDay {
  return {
    id: 'd1',
    eaten: false,
    eatenAt: null,
    status: 'SCHEDULED',
    consumption: 'UNRECORDED',
    consumptionNote: null,
    ...partial,
  };
}

function order(partial: Partial<Order> & { days: OrderDay[] }): Order {
  return {
    id: 'o1',
    mode: 'CALENDAR',
    status: 'CONFIRMED',
    paymentMethod: 'COD',
    unitPriceGrosze: 4500,
    goodsGrosze: 45000,
    discountPercent: 0,
    discountGrosze: 0,
    shippingGrosze: 0,
    totalGrosze: 45000,
    adjustedTotalGrosze: null,
    cancelledAt: null,
    cancelReason: null,
    createdAt: '2026-09-10T07:00:00.000Z',
    delivery: null,
    contactPhone: null,
    deliveryNotes: null,
    ...partial,
  };
}

describe('canChangeScheduledDay', () => {
  it('refuses a day inside the lead-time window', () => {
    expect(canChangeScheduledDay('2026-09-15', NOW)).toBe(false);
    expect(canChangeScheduledDay('2026-09-16', NOW)).toBe(false);
  });

  it('allows a day at or after the lead-time deadline', () => {
    expect(canChangeScheduledDay('2026-09-17', NOW)).toBe(true);
    expect(canChangeScheduledDay('2026-09-30', NOW)).toBe(true);
  });
});

describe('dayActions', () => {
  it('offers tracking, never skip/move, for a past day', () => {
    const actions = dayActions(day({ deliverOn: '2026-09-14T00:00:00.000Z' }), TODAY, NOW);
    expect(actions).toEqual({ canTrack: true, canSkip: false, canMove: false });
  });

  it('offers tracking for today', () => {
    const actions = dayActions(day({ deliverOn: '2026-09-15T00:00:00.000Z' }), TODAY, NOW);
    expect(actions).toEqual({ canTrack: true, canSkip: false, canMove: false });
  });

  it('locks a future day still inside the deadline — no action at all', () => {
    const actions = dayActions(day({ deliverOn: '2026-09-16T00:00:00.000Z' }), TODAY, NOW);
    expect(actions).toEqual({ canTrack: false, canSkip: false, canMove: false });
  });

  it('offers skip and move for a future SCHEDULED day past the deadline', () => {
    const actions = dayActions(day({ deliverOn: '2026-09-20T00:00:00.000Z' }), TODAY, NOW);
    expect(actions).toEqual({ canTrack: false, canSkip: true, canMove: true });
  });

  it('never offers anything for a CANCELLED day, past or future', () => {
    const past = dayActions(day({ deliverOn: '2026-09-14T00:00:00.000Z', status: 'CANCELLED' }), TODAY, NOW);
    const future = dayActions(day({ deliverOn: '2026-09-25T00:00:00.000Z', status: 'CANCELLED' }), TODAY, NOW);
    expect(past).toEqual({ canTrack: false, canSkip: false, canMove: false });
    expect(future).toEqual({ canTrack: false, canSkip: false, canMove: false });
  });

  it('does not offer skip/move for a future day already SKIPPED', () => {
    const actions = dayActions(day({ deliverOn: '2026-09-25T00:00:00.000Z', status: 'SKIPPED' }), TODAY, NOW);
    expect(actions).toEqual({ canTrack: false, canSkip: false, canMove: false });
  });
});

describe('canCancelRemaining', () => {
  it('refuses an already-cancelled order', () => {
    expect(
      canCancelRemaining(order({ status: 'CANCELLED', days: [day({ deliverOn: '2026-09-25T00:00:00.000Z' })] }), NOW),
    ).toBe(false);
  });

  it('refuses when nothing is still SCHEDULED', () => {
    expect(
      canCancelRemaining(
        order({ days: [day({ deliverOn: '2026-09-10T00:00:00.000Z', status: 'DELIVERED' })] }),
        NOW,
      ),
    ).toBe(false);
  });

  it('refuses when any SCHEDULED day is inside the deadline', () => {
    expect(
      canCancelRemaining(
        order({
          days: [
            day({ deliverOn: '2026-09-16T00:00:00.000Z' }),
            day({ deliverOn: '2026-09-25T00:00:00.000Z' }),
          ],
        }),
        NOW,
      ),
    ).toBe(false);
  });

  it('allows cancelling when every SCHEDULED day is past the deadline', () => {
    expect(
      canCancelRemaining(
        order({
          days: [
            day({ deliverOn: '2026-09-10T00:00:00.000Z', status: 'DELIVERED' }),
            day({ deliverOn: '2026-09-20T00:00:00.000Z' }),
            day({ deliverOn: '2026-09-25T00:00:00.000Z' }),
          ],
        }),
        NOW,
      ),
    ).toBe(true);
  });
});
