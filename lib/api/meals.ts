import { apiFetch } from './client';

/**
 * The public meal catalogue — `GET /v1/meals`, active meals only. Mirrors
 * `bobr_backend/src/catalog/catalog.controller.ts`.
 */

export interface Meal {
  id: string;
  type: string;
  namePl: string;
  nameEn: string;
  descriptionPl: string | null;
  descriptionEn: string | null;
  /** Integer grosze per delivery day, before any calendar discount. */
  priceGrosze: number;
  imageUrl: string | null;
}

/** Public — no session needed, so no cookie is sent. */
export function apiListMeals(signal?: AbortSignal) {
  return apiFetch<Meal[]>('/meals', { auth: false, signal });
}

/** The meal's name in the page's language. */
export function mealName(meal: Pick<Meal, 'namePl' | 'nameEn'>, locale: string): string {
  return locale === 'pl' ? meal.namePl : meal.nameEn;
}

/** The meal's description in the page's language, or null when it has none. */
export function mealDescription(
  meal: Pick<Meal, 'descriptionPl' | 'descriptionEn'>,
  locale: string,
): string | null {
  const text = locale === 'pl' ? meal.descriptionPl : meal.descriptionEn;
  return text?.trim() ? text : null;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** A `?meal=` value worth passing on, or null. The API is the judge of whether it exists. */
export function parseMealParam(raw: string | string[] | null | undefined): string | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value && UUID.test(value) ? value.toLowerCase() : null;
}
