import {
  earliestDeliveryDay,
  groupByMonth,
  offeredDeliveryDays,
  todayInWarsaw,
  warsawDaysFromToday,
  warsawWallClockToIso,
} from '@/lib/dates';

describe('Warsaw delivery days', () => {
  it('counts today in Warsaw, not UTC, just after Warsaw midnight', () => {
    // 22:30 UTC on the 13th is 00:30 CEST on the 14th.
    const now = new Date('2026-09-13T22:30:00Z');
    expect(todayInWarsaw(now)).toBe('2026-09-14');
    expect(earliestDeliveryDay(now)).toBe('2026-09-16');
  });

  it('keeps the UTC day just before Warsaw midnight', () => {
    const now = new Date('2026-09-13T21:30:00Z'); // 23:30 CEST on the 13th
    expect(earliestDeliveryDay(now)).toBe('2026-09-15');
  });

  it('offers days from the earliest through the end of the following month', () => {
    const days = offeredDeliveryDays(new Date('2026-09-13T22:30:00Z'));
    expect(days[0]).toBe('2026-09-16');
    expect(days[days.length - 1]).toBe('2026-10-31');
    // 15 September days (16..30) + 31 October days, no gaps or duplicates.
    expect(days).toHaveLength(15 + 31);
    expect(new Set(days).size).toBe(days.length);
  });

  it('crosses a year and a DST change without skipping a day', () => {
    const days = offeredDeliveryDays(new Date('2026-12-20T10:00:00Z'));
    expect(days[0]).toBe('2026-12-22');
    expect(days[days.length - 1]).toBe('2027-01-31');
    const march = offeredDeliveryDays(new Date('2027-03-20T10:00:00Z'));
    expect(march).toContain('2027-03-28');
    expect(march).toContain('2027-03-29');
    expect(march[march.length - 1]).toBe('2027-04-30');
  });

  it('groups days by month in order', () => {
    const groups = groupByMonth(offeredDeliveryDays(new Date('2026-09-13T22:30:00Z')));
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
});
