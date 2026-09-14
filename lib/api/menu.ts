import { apiFetch } from './client';

/**
 * The public menu. Mirrors the contract pinned in ebneely/bobr-backend#28 —
 * spellings and order of every union below are part of that contract, so they
 * change in all three repos or not at all.
 */

/** In eating order. The page draws the day in exactly this sequence. */
export const MENU_COURSES = ['BREAKFAST', 'SECOND_BREAKFAST', 'LUNCH', 'SNACK', 'DINNER'] as const;
export type MenuCourse = (typeof MENU_COURSES)[number];

/** The EU 14, in the contract's order. */
export const ALLERGENS = [
  'GLUTEN',
  'CRUSTACEANS',
  'EGGS',
  'FISH',
  'PEANUTS',
  'SOY',
  'MILK',
  'NUTS',
  'CELERY',
  'MUSTARD',
  'SESAME',
  'SULPHITES',
  'LUPIN',
  'MOLLUSCS',
] as const;
export type Allergen = (typeof ALLERGENS)[number];

/** The diets a dish can belong to — the backend's `MealType`, minus CONSULTATION. */
export const MENU_DIETS = ['KETOGENIC', 'GLUTEN_FREE', 'ALLERGIES'] as const;
export type MenuDiet = (typeof MENU_DIETS)[number];

export type MenuDocumentKind = 'PDF' | 'IMAGE';

export interface MenuDocument {
  kind: MenuDocumentKind;
  url: string;
  /** A rendered first page for a PDF, or a smaller copy of an image. */
  previewUrl: string | null;
  updatedAt: string;
}

export interface MenuItem {
  id: string;
  course: MenuCourse;
  /** In the request locale. */
  name: string;
  description: string | null;
  namePl: string;
  nameEn: string;
  descriptionPl: string | null;
  descriptionEn: string | null;
  diet: MenuDiet | null;
  mealId: string | null;
  kcal: number | null;
  proteinG: number | null;
  fatG: number | null;
  carbsG: number | null;
  allergens: Allergen[];
  tags: string[];
  imageUrl: string | null;
}

export interface MenuResponse {
  document: MenuDocument | null;
  /** Active only, ordered by course then sortOrder. */
  items: MenuItem[];
}

export interface MenuQuery {
  q?: string;
  course?: MenuCourse | null;
  diet?: MenuDiet | null;
  without?: readonly Allergen[];
  locale?: string;
}

/** `?q=&course=&diet=&without=A,B&locale=` with every empty value left out. */
export function menuSearchString({ q, course, diet, without, locale }: MenuQuery): string {
  const params = new URLSearchParams();
  const term = q?.trim();
  if (term) params.set('q', term);
  if (course) params.set('course', course);
  if (diet) params.set('diet', diet);
  if (without && without.length > 0) params.set('without', without.join(','));
  if (locale) params.set('locale', locale);
  const s = params.toString();
  return s ? `?${s}` : '';
}

/** Public — no session needed, so no cookie is sent. */
export function apiGetMenu(query: MenuQuery = {}, init?: { signal?: AbortSignal }) {
  return apiFetch<MenuResponse>(`/menu${menuSearchString(query)}`, {
    auth: false,
    signal: init?.signal,
  });
}
