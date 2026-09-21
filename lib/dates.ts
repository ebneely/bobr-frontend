import { TZDate, tz } from '@date-fns/tz';
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  startOfDay,
} from 'date-fns';

/**
 * Calendar days for the order flow and consultation booking, counted in
 * Europe/Warsaw.
 *
 * Every day leaves this module as a `YYYY-MM-DD` string that names a Warsaw
 * calendar day. The browser's own zone never enters the arithmetic: a customer
 * in Warsaw on a laptop still set to UTC, or a test runner in a UTC container,
 * sees the same days. No `toISOString().slice(0, 10)` (that is UTC) and no
 * `setDate` maths (that is the local zone) — date-fns with `in: tz(...)` only.
 */

export const WARSAW = 'Europe/Warsaw';

/**
 * The admin-edited calendar rules (`/v1/settings/public`, ebneely/bobr-backend#57).
 * Always passed in, never defaulted: a default here would be a second copy of
 * the owner's numbers. The server enforces the same rules on the quote/order.
 */
export interface CalendarRules {
  leadDays: number;
  /** Warsaw hour from which today stops counting; null = no cut-off. */
  orderCutoffHour: number | null;
  orderWindowMonths: number;
  /** ISO weekdays delivered, 1 = Monday … 7 = Sunday. */
  deliveryWeekdays: number[];
}

const inWarsaw = tz(WARSAW);
const DAY = 'yyyy-MM-dd';

/** Midnight at the start of the Warsaw calendar day containing `now`. */
function warsawStartOfDay(now: Date): TZDate {
  return startOfDay(now, { in: inWarsaw });
}

/** A `YYYY-MM-DD` string as midnight of that Warsaw day. */
export function warsawDay(day: string): TZDate {
  const [y, m, d] = day.split('-').map(Number);
  return new TZDate(y, m - 1, d, WARSAW);
}

/** Today in Warsaw, as `YYYY-MM-DD`. */
export function todayInWarsaw(now: Date = new Date()): string {
  return format(warsawStartOfDay(now), DAY, { in: inWarsaw });
}

/** Warsaw today + `days`, as `YYYY-MM-DD`. */
export function warsawDaysFromToday(days: number, now: Date = new Date()): string {
  return format(addDays(warsawStartOfDay(now), days, { in: inWarsaw }), DAY, {
    in: inWarsaw,
  });
}

/**
 * The first day that can be delivered: Warsaw today + the lead time, one day
 * later once the Warsaw clock has passed the order cut-off hour.
 */
export function earliestDeliveryDay(
  rules: Pick<CalendarRules, 'leadDays' | 'orderCutoffHour'>,
  now: Date = new Date(),
): string {
  const pastCutoff =
    rules.orderCutoffHour !== null &&
    Number(format(now, 'H', { in: inWarsaw })) >= rules.orderCutoffHour;
  return warsawDaysFromToday(rules.leadDays + (pastCutoff ? 1 : 0), now);
}

/**
 * Every `YYYY-MM-DD` from `first` through the last day of the calendar month
 * `months` after `first`'s month — with 1, any whole month that starts on or
 * after `first` can be picked in full.
 */
export function daysThroughEndOfMonthsAfter(first: string, months: number): string[] {
  const start = warsawDay(first);
  const end = endOfMonth(addMonths(start, months, { in: inWarsaw }), { in: inWarsaw });
  return eachDayOfInterval({ start, end }, { in: inWarsaw }).map((d) =>
    format(d, DAY, { in: inWarsaw }),
  );
}

/** ISO weekday of a Warsaw day, 1 = Monday … 7 = Sunday. */
export function isoWeekday(day: string): number {
  return Number(format(warsawDay(day), 'i', { in: inWarsaw }));
}

/** Whether the kitchen delivers on `day`: a delivered weekday, not closed. */
export function isDeliveryDay(
  day: string,
  rules: Pick<CalendarRules, 'deliveryWeekdays'>,
  closedDays: ReadonlySet<string>,
): boolean {
  return rules.deliveryWeekdays.includes(isoWeekday(day)) && !closedDays.has(day);
}

/**
 * The calendar grid for ordering: earliest delivery day to the end of the
 * order window. Every day is returned so the grid keeps its shape; use
 * `isDeliveryDay` to tell which ones can be picked.
 */
export function offeredDeliveryDays(rules: CalendarRules, now: Date = new Date()): string[] {
  return daysThroughEndOfMonthsAfter(earliestDeliveryDay(rules, now), rules.orderWindowMonths);
}

/** `YYYY-MM` of a `YYYY-MM-DD`, for grouping days by month. */
export function monthKey(day: string): string {
  return day.slice(0, 7);
}

/** Groups ordered `YYYY-MM-DD` strings by calendar month, keeping order. */
export function groupByMonth(days: string[]): { month: string; days: string[] }[] {
  const groups: { month: string; days: string[] }[] = [];
  for (const day of days) {
    const key = monthKey(day);
    const last = groups[groups.length - 1];
    if (last && last.month === key) last.days.push(day);
    else groups.push({ month: key, days: [day] });
  }
  return groups;
}

function intlLocale(locale: string): string {
  return locale === 'pl' ? 'pl-PL' : 'en-GB';
}

/** Short day label, e.g. "śr., 16 wrz" / "Wed 16 Sept". */
export function formatDayLabel(day: string, locale: string): string {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    timeZone: WARSAW,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(warsawDay(day));
}

/** Long day label, e.g. "środa, 16 września 2026". */
export function formatLongDay(day: string, locale: string): string {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    timeZone: WARSAW,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(warsawDay(day));
}

/** Month heading for a `YYYY-MM` key, e.g. "wrzesień 2026" / "September 2026". */
export function formatMonthLabel(month: string, locale: string): string {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    timeZone: WARSAW,
    month: 'long',
    year: 'numeric',
  }).format(warsawDay(`${month}-01`));
}

/**
 * A Warsaw wall-clock time on a Warsaw day, as a UTC ISO instant.
 *
 * `"2026-09-20"`, `"09:30"` → `"2026-09-20T07:30:00.000Z"` (CEST, +02:00).
 */
export function warsawWallClockToIso(day: string, time: string): string {
  const [y, m, d] = day.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  return new Date(new TZDate(y, m - 1, d, hh, mm, WARSAW).getTime()).toISOString();
}

/**
 * Consultation slots as `HH:mm`, Warsaw wall clock: `start` through `end`
 * INCLUSIVE, every `stepMinutes` from `start` — the admin's settings, and the
 * exact set the API accepts.
 */
export function slotTimes(start: string, end: string, stepMinutes: number): string[] {
  const toMinutes = (hhmm: string) => {
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + m;
  };
  const first = toMinutes(start);
  const last = toMinutes(end);
  if (!(stepMinutes > 0) || last < first) return [];
  const slots: string[] = [];
  for (let minutes = first; minutes <= last; minutes += stepMinutes) {
    slots.push(
      `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`,
    );
  }
  return slots;
}
