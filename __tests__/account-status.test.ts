import {
  consultationPayment,
  consultationStatusTone,
  consultationWhen,
  dayTiming,
  formatWarsawDateTime,
  intakeState,
  joinableMeetUrl,
  latestOrder,
  nextDelivery,
  noteState,
  orderDayKey,
  orderDayRange,
  orderStatusTone,
  plainAmount,
  pricedDayCount,
  remainingDays,
  shortId,
  sortNotes,
  unpaidConsultations,
  upcomingConsultation,
} from '@/lib/api/account-status';
import type { Consultation } from '@/lib/api/consultations';
import type { CustomerNote, Order } from '@/lib/api/orders';

function order(partial: Omit<Partial<Order>, 'days'> & { days?: string[] }): Order {
  const { days = [], ...rest } = partial;
  return {
    id: 'o1',
    mode: 'CALENDAR',
    status: 'PENDING',
    paymentMethod: 'COD',
    unitPriceGrosze: 4500,
    goodsGrosze: 45000,
    discountPercent: 10,
    discountGrosze: 4500,
    shippingGrosze: 0,
    totalGrosze: 40500,
    adjustedTotalGrosze: null,
    cancelledAt: null,
    cancelReason: null,
    createdAt: '2026-09-15T07:00:00.000Z',
    delivery: null,
    contactPhone: null,
    deliveryNotes: null,
    ...rest,
    days: days.map((d, i) => ({
      id: `d${i}`,
      deliverOn: `${d}T00:00:00.000Z`,
      eaten: false,
      eatenAt: null,
      status: 'SCHEDULED' as const,
      consumption: 'UNRECORDED' as const,
      consumptionNote: null,
    })),
  };
}

function consultation(partial: Partial<Consultation>): Consultation {
  return {
    id: 'c1',
    context: 'BEFORE_PLAN',
    preferredAt: '2026-09-20T08:00:00.000Z',
    note: null,
    priceGrosze: 10000,
    status: 'REQUESTED',
    scheduledAt: null,
    meetUrl: null,
    confirmedAt: null,
    paidAt: null,
    paymentReference: 'BOBR-ABCDEF12',
    createdAt: '2026-09-15T07:00:00.000Z',
    ...partial,
  };
}

describe('status tones', () => {
  it('maps every order status to a distinct family', () => {
    expect(orderStatusTone('PENDING')).toBe('waiting');
    expect(orderStatusTone('CONFIRMED')).toBe('ok');
    expect(orderStatusTone('PROCESSING')).toBe('active');
    expect(orderStatusTone('DELIVERED')).toBe('done');
    expect(orderStatusTone('CANCELLED')).toBe('off');
  });

  it('maps every consultation status', () => {
    expect(consultationStatusTone('REQUESTED')).toBe('waiting');
    expect(consultationStatusTone('CONFIRMED')).toBe('ok');
    expect(consultationStatusTone('COMPLETED')).toBe('done');
    expect(consultationStatusTone('CANCELLED')).toBe('off');
  });
});

describe('delivery days', () => {
  it('reads the DATE part of deliverOn without shifting it through a zone', () => {
    expect(orderDayKey('2026-09-20T00:00:00.000Z')).toBe('2026-09-20');
    expect(orderDayKey('2026-09-20')).toBe('2026-09-20');
  });

  it('classifies a day against Warsaw today', () => {
    expect(dayTiming('2026-09-14T00:00:00.000Z', '2026-09-15')).toBe('past');
    expect(dayTiming('2026-09-15T00:00:00.000Z', '2026-09-15')).toBe('today');
    expect(dayTiming('2026-09-16T00:00:00.000Z', '2026-09-15')).toBe('upcoming');
  });

  it('finds the soonest day across live orders, today included', () => {
    const a = order({ id: 'a', days: ['2026-09-18', '2026-09-19'] });
    const b = order({ id: 'b', days: ['2026-09-14', '2026-09-15', '2026-09-22'] });
    const next = nextDelivery([a, b], '2026-09-15');
    expect(next?.order.id).toBe('b');
    expect(next?.day).toBe('2026-09-15');
  });

  it('ignores cancelled and delivered orders and past days', () => {
    const cancelled = order({ id: 'x', status: 'CANCELLED', days: ['2026-09-16'] });
    const delivered = order({ id: 'y', status: 'DELIVERED', days: ['2026-09-16'] });
    const past = order({ id: 'z', days: ['2026-09-01'] });
    expect(nextDelivery([cancelled, delivered, past], '2026-09-15')).toBeNull();
    expect(nextDelivery([], '2026-09-15')).toBeNull();
  });

  it('counts remaining days and the range of an order', () => {
    const o = order({ days: ['2026-09-22', '2026-09-14', '2026-09-15'] });
    expect(remainingDays(o, '2026-09-15')).toBe(2);
    expect(orderDayRange(o)).toEqual({ first: '2026-09-14', last: '2026-09-22' });
    expect(orderDayRange(order({}))).toBeNull();
  });

  it('does not count a skipped day as priced or a skipped/cancelled day as remaining or next', () => {
    // 5-day plan, 20 Sep skipped → a 6th row added at the end (25 Sep).
    const o = order({ days: ['2026-09-20', '2026-09-21', '2026-09-22', '2026-09-23', '2026-09-24', '2026-09-25'] });
    o.days[0] = { ...o.days[0], status: 'SKIPPED' };
    expect(pricedDayCount(o)).toBe(5);
    expect(remainingDays(o, '2026-09-15')).toBe(5);
    expect(nextDelivery([o], '2026-09-15')?.day).toBe('2026-09-21');
    // Cancel the rest: still priced for 5, nothing remains, no next delivery.
    const cancelled = { ...o, days: o.days.map((d, i) => (i === 0 ? d : { ...d, status: 'CANCELLED' as const })) };
    expect(pricedDayCount(cancelled)).toBe(5);
    expect(remainingDays(cancelled, '2026-09-15')).toBe(0);
    expect(nextDelivery([cancelled], '2026-09-15')).toBeNull();
  });

  it('picks the most recently placed order', () => {
    const older = order({ id: 'old', createdAt: '2026-09-01T10:00:00.000Z' });
    const newer = order({ id: 'new', createdAt: '2026-09-10T10:00:00.000Z' });
    expect(latestOrder([older, newer])?.id).toBe('new');
    expect(latestOrder([])).toBeNull();
  });
});

describe('consultation payment', () => {
  it('is paid once the admin set paidAt, whatever the status', () => {
    expect(consultationPayment({ paidAt: '2026-09-15T10:00:00Z', status: 'REQUESTED' })).toBe('paid');
    expect(consultationPayment({ paidAt: '2026-09-15T10:00:00Z', status: 'CANCELLED' })).toBe('paid');
  });

  it('is unpaid while the booking is open or done, and not due once cancelled', () => {
    expect(consultationPayment({ paidAt: null, status: 'REQUESTED' })).toBe('unpaid');
    expect(consultationPayment({ paidAt: null, status: 'CONFIRMED' })).toBe('unpaid');
    expect(consultationPayment({ paidAt: null, status: 'COMPLETED' })).toBe('unpaid');
    expect(consultationPayment({ paidAt: null, status: 'CANCELLED' })).toBe('notDue');
  });

  it('lists the ones still waiting for a transfer', () => {
    const list = [
      consultation({ id: 'p', paidAt: '2026-09-15T10:00:00Z' }),
      consultation({ id: 'u' }),
      consultation({ id: 'c', status: 'CANCELLED' }),
    ];
    expect(unpaidConsultations(list).map((c) => c.id)).toEqual(['u']);
  });
});

describe('Meet link rule', () => {
  const url = 'https://meet.google.com/abc-defg-hij';

  it('shows the link only on a CONFIRMED consultation', () => {
    expect(joinableMeetUrl({ status: 'CONFIRMED', meetUrl: url })).toBe(url);
    expect(joinableMeetUrl({ status: 'REQUESTED', meetUrl: url })).toBeNull();
    expect(joinableMeetUrl({ status: 'COMPLETED', meetUrl: url })).toBeNull();
    expect(joinableMeetUrl({ status: 'CANCELLED', meetUrl: url })).toBeNull();
    expect(joinableMeetUrl({ status: 'CONFIRMED', meetUrl: null })).toBeNull();
  });

  it('refuses anything that is not a Google Meet address', () => {
    expect(joinableMeetUrl({ status: 'CONFIRMED', meetUrl: 'javascript:alert(1)' })).toBeNull();
    expect(joinableMeetUrl({ status: 'CONFIRMED', meetUrl: 'https://evil.example/meet' })).toBeNull();
  });
});

describe('upcoming consultation', () => {
  const now = new Date('2026-09-15T10:00:00.000Z');

  it('uses the confirmed slot over the preference', () => {
    expect(consultationWhen(consultation({ scheduledAt: '2026-09-21T09:00:00.000Z' }))).toEqual({
      at: '2026-09-21T09:00:00.000Z',
      confirmed: true,
    });
    expect(consultationWhen(consultation({}))).toEqual({
      at: '2026-09-20T08:00:00.000Z',
      confirmed: false,
    });
  });

  it('picks the soonest open booking that has not long passed', () => {
    const list = [
      consultation({ id: 'later', preferredAt: '2026-09-25T08:00:00.000Z' }),
      consultation({ id: 'soon', status: 'CONFIRMED', scheduledAt: '2026-09-16T08:00:00.000Z' }),
      consultation({ id: 'gone', preferredAt: '2026-09-10T08:00:00.000Z' }),
      consultation({ id: 'cancelled', status: 'CANCELLED', preferredAt: '2026-09-15T12:00:00.000Z' }),
      consultation({ id: 'done', status: 'COMPLETED', preferredAt: '2026-09-15T12:00:00.000Z' }),
    ];
    expect(upcomingConsultation(list, now)?.id).toBe('soon');
  });

  it('keeps a call that started less than an hour ago', () => {
    const list = [consultation({ id: 'now', status: 'CONFIRMED', scheduledAt: '2026-09-15T09:30:00.000Z' })];
    expect(upcomingConsultation(list, now)?.id).toBe('now');
    expect(upcomingConsultation([], now)).toBeNull();
  });
});

describe('notes', () => {
  const base: CustomerNote = {
    id: 'n',
    kind: 'NOTE',
    body: 'x',
    adminReply: null,
    repliedAt: null,
    createdAt: '2026-09-10T10:00:00.000Z',
    orderId: null,
  };

  it('is answered only with both a reply and a reply time', () => {
    expect(noteState(base)).toBe('awaiting');
    expect(noteState({ ...base, adminReply: 'ok', repliedAt: '2026-09-11T10:00:00Z' })).toBe('answered');
  });

  it('sorts awaiting first, then newest', () => {
    const sorted = sortNotes([
      { ...base, id: 'answered-new', adminReply: 'ok', repliedAt: 'x', createdAt: '2026-09-14T00:00:00Z' },
      { ...base, id: 'awaiting-old', createdAt: '2026-09-01T00:00:00Z' },
      { ...base, id: 'awaiting-new', createdAt: '2026-09-12T00:00:00Z' },
    ]);
    expect(sorted.map((n) => n.id)).toEqual(['awaiting-new', 'awaiting-old', 'answered-new']);
  });
});

describe('intake and formatting', () => {
  it('reads the intake gate', () => {
    expect(intakeState(null)).toBe('missing');
    expect(intakeState({ completedAt: null })).toBe('incomplete');
    expect(intakeState({ completedAt: '2026-09-15T07:15:24.865Z' })).toBe('complete');
  });

  it('formats an instant in Warsaw time, not the runner zone', () => {
    // 08:00 UTC is 10:00 CEST.
    expect(formatWarsawDateTime('2026-09-20T08:00:00.000Z', 'en')).toContain('10:00');
    expect(formatWarsawDateTime('2026-09-20T08:00:00.000Z', 'pl')).toContain('10:00');
    // 23:30 UTC on the 20th is already the 21st in Warsaw.
    expect(formatWarsawDateTime('2026-09-20T23:30:00.000Z', 'en')).toContain('21');
  });

  it('writes a bank-app amount from integer grosze', () => {
    expect(plainAmount(10000, 'pl')).toBe('100,00');
    expect(plainAmount(4505, 'en')).toBe('45.05');
    expect(plainAmount(7, 'pl')).toBe('0,07');
  });

  it('shortens an id for quoting', () => {
    expect(shortId('6b8b7614-90f5-4b90-8c2f-6c2a06601daf')).toBe('6B8B7614');
  });
});
