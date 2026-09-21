import { apiFetch } from './client';
import type { ImageSrcSet } from '@/lib/images/srcset-loader';

/**
 * Everything an admin edits in the dashboard that the storefront shows —
 * `GET /v1/settings/public`, derived server-side from the one settings
 * registry (ebneely/bobr-backend#57). The storefront keeps NO copy of these
 * values: a constant here would be a second source of truth that silently
 * disagrees the first time the owner changes a number.
 *
 * The server stays authoritative — the quote and the order are priced and
 * validated there. These values only shape what the storefront offers.
 */

export interface LocalizedText {
  pl: string;
  en: string;
}

export interface DiscountTier {
  minDays: number;
  percent: number;
}

export interface SettingsImage {
  url: string;
  srcSet: ImageSrcSet | null;
  width: number | null;
  height: number | null;
}

export interface PublicSettings {
  consultationPriceGrosze: number;
  doctorName: LocalizedText;
  /** `HH:mm`, Warsaw wall clock. */
  consultationSlotStart: string;
  consultationSlotEnd: string;
  consultationSlotStepMinutes: number;
  /** ISO weekdays, 1 = Monday … 7 = Sunday. */
  deliveryWeekdays: number[];
  /** Warsaw hour from which today no longer counts towards the lead time. */
  orderCutoffHour: number | null;
  leadDays: number;
  orderWindowMonths: number;
  changeCutoffDays: number;
  calendarMinDays: number;
  oneTimeDayCount: number;
  discountTiers: DiscountTier[];
  wholeMonthPercent: number;
  calendarFreeShipping: boolean;
  heroImage: SettingsImage | null;
  contactEmail: string | null;
  contactPhone: string | null;
  contactAddress: string | null;
  footerTagline: LocalizedText;
}

interface PublicSettingsResponse {
  values: PublicSettings;
  updatedAt: string;
}

/** Public — no session, no cookie. */
export function apiGetPublicSettings(signal?: AbortSignal): Promise<PublicSettings> {
  return apiFetch<PublicSettingsResponse>('/settings/public', { signal }).then(
    (body) => body.values,
  );
}

/** Days the kitchen does not deliver (`YYYY-MM-DD`), from `from` onwards. */
export function apiGetClosedDays(from: string, signal?: AbortSignal): Promise<string[]> {
  return apiFetch<{ items: { date: string }[] }>(
    `/settings/public/closed-days?from=${encodeURIComponent(from)}`,
    { signal },
  ).then((body) => body.items.map((item) => item.date));
}

export interface PaymentSettings {
  /** Normalised `+48XXXXXXXXX`, or null until the admin enters one. */
  blikPhone: string | null;
  blikRecipientName: string | null;
}

/**
 * Signed in, any role — the BLIK number is for people who book, not scrapers,
 * so it is deliberately not part of the public settings.
 */
export function apiGetPaymentSettings() {
  return apiFetch<PaymentSettings>('/settings/payment');
}

/** The locale's side of a pl/en pair. */
export function localized(text: LocalizedText, locale: string): string {
  return locale === 'en' ? text.en : text.pl;
}
