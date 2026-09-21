import {
  earliestDeliveryDay,
  groupByMonth,
  isDeliveryDay,
  offeredDeliveryDays,
  todayInWarsaw,
  warsawDaysFromToday,
  warsawWallClockToIso,
} from '@/lib/dates';
import type { CalendarRules } from '@/lib/dates';

// The registry defaults as of 2026-09-21; the rules always come from the API.
const RULES: CalendarRules = {
  leadDays: 2,
  orderCutoffHour: null,
  orderWindowMonths: 1,
  deliveryWeekdays: [1, 2, 3, 4, 5, 6],
};

describe('Warsaw delivery days', () => {
  it('counts today in Warsaw, not UTC, just after Warsaw midnight', () => {
    // 22:30 UTC on the 13th is 00:30 CEST on the 14th.
    const now = new Date('2026-09-13T22:30:00Z');
    expect(todayInWarsaw(now)).toBe('2026-09-14');
    expect(earliestDeliveryDay(RULES, now)).toBe('2026-09-16');
  });

  it('keeps the UTC day just before Warsaw midnight', () => {
    const now = new Date('2026-09-13T21:30:00Z'); // 23:30 CEST on the 13th
    expect(earliestDeliveryDay(RULES, now)).toBe('2026-09-15');
  });

  it('offers days from the earliest through the end of the following month', () => {
    const days = offeredDeliveryDays(RULES, new Date('2026-09-13T22:30:00Z'));
    expect(days[0]).toBe('2026-09-16');
    expect(days[days.length - 1]).toBe('2026-10-31');
    // 15 September days (16..30) + 31 October days, no gaps or duplicates.
    expect(days).toHaveLength(15 + 31);
    expect(new Set(days).size).toBe(days.length);
  });

  it('crosses a year and a DST change without skipping a day', () => {
    const days = offeredDeliveryDays(RULES, new Date('2026-12-20T10:00:00Z'));
    expect(days[0]).toBe('2026-12-22');
    expect(days[days.length - 1]).toBe('2027-01-31');
    const march = offeredDeliveryDays(RULES, new Date('2027-03-20T10:00:00Z'));
    expect(march).toContain('2027-03-28');
    expect(march).toContain('2027-03-29');
    expect(march[march.length - 1]).toBe('2027-04-30');
  });

  it('groups days by month in order', () => {
    const groups = groupByMonth(offeredDeliveryDays(RULES, new Date('2026-09-13T22:30:00Z')));
    expect(groups.map((g) => g.month)).toEqual(['2026-09', '2026-10']);
    expect(groups[1].days).toHaveLength(31);
  });

  it('adds days in Warsaw for consultation booking', () => {
    expect(warsawDaysFromToday(1, new Date('2026-09-13T22:30:00Z'))).toBe('2026-09-15');
  });

  it('converts a Warsaw wall-clock time to a UTC instant', () => {
    expect(warsawWallClockToIso('2026-09-20', '09:30')).toBe('2026-09-20T07:30:00.000Z');
    expect(warsawWallClockToIso('2026-12-01', '08:00')).toBe('2026-12-01T07:00:00.000Z');
  });

  it('moves the earliest day once the Warsaw clock passes the cut-off hour', () => {
    const at = (iso: string) => earliestDeliveryDay({ ...RULES, orderCutoffHour: 14 }, new Date(iso));
    expect(at('2026-09-14T11:59:00Z')).toBe('2026-09-16'); // 13:59 CEST
    expect(at('2026-09-14T12:00:00Z')).toBe('2026-09-17'); // 14:00 CEST
  });

  it('follows the admin lead time and order window', () => {
    const days = offeredDeliveryDays(
      { ...RULES, leadDays: 0, orderWindowMonths: 2 },
      new Date('2026-09-14T10:00:00Z'),
    );
    expect(days[0]).toBe('2026-09-14');
    expect(days[days.length - 1]).toBe('2026-11-30');
  });

  it('knows delivered weekdays and closed days', () => {
    const closed = new Set(['2026-11-11']);
    expect(isDeliveryDay('2026-09-20', RULES, closed)).toBe(false); // Sunday
    expect(isDeliveryDay('2026-09-21', RULES, closed)).toBe(true); // Monday
    expect(isDeliveryDay('2026-11-11', RULES, closed)).toBe(false); // closed
  });
});
