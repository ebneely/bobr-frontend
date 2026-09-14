import {
  ALLERGENS,
  MENU_COURSES,
  MENU_DIETS,
  type Allergen,
  type MenuCourse,
  type MenuDiet,
  type MenuItem,
} from '@/lib/api/menu';

/**
 * What the menu page is filtered by, and how that state round-trips through the
 * URL (`/menu?q=&diet=&without=`) so a search can be shared or bookmarked.
 *
 * Pure functions, no React: the server page parses the incoming URL with the
 * same code the client uses to write it back, so the two can never disagree.
 */

export interface MenuFilters {
  q: string;
  diet: MenuDiet | null;
  /** Always unique and in the contract's canonical order. */
  without: Allergen[];
}

export const EMPTY_MENU_FILTERS: MenuFilters = { q: '', diet: null, without: [] };

/** Long enough for any dish name; short enough that a pasted essay is not sent. */
export const MENU_QUERY_MAX = 80;

type RawParams =
  | URLSearchParams
  | Record<string, string | string[] | undefined>
  | null
  | undefined;

function readParam(params: RawParams, key: string): string {
  if (!params) return '';
  if (params instanceof URLSearchParams) return params.get(key) ?? '';
  const value = params[key];
  return (Array.isArray(value) ? value[0] : value) ?? '';
}

const isDiet = (v: string): v is MenuDiet => (MENU_DIETS as readonly string[]).includes(v);
const isAllergen = (v: string): v is Allergen => (ALLERGENS as readonly string[]).includes(v);

/**
 * Anything invalid is dropped rather than rejected: a hand-edited or stale link
 * should still open the menu, just less filtered. The API answers an unknown
 * enum with a 422, so nothing unknown may reach it from here.
 */
export function parseMenuFilters(params: RawParams): MenuFilters {
  const q = readParam(params, 'q').trim().slice(0, MENU_QUERY_MAX);

  const dietRaw = readParam(params, 'diet').trim().toUpperCase();
  const diet = isDiet(dietRaw) ? dietRaw : null;

  const requested = new Set(
    readParam(params, 'without')
      .split(',')
      .map((s) => s.trim().toUpperCase())
      .filter(isAllergen),
  );
  const without = ALLERGENS.filter((a) => requested.has(a));

  return { q, diet, without };
}

/**
 * The query string for a filter state, `''` when nothing is filtered. Commas in
 * `without` are left literal so the link stays readable when pasted.
 */
export function serializeMenuFilters({ q, diet, without }: MenuFilters): string {
  const parts: string[] = [];
  const term = q.trim();
  if (term) parts.push(`q=${encodeURIComponent(term)}`);
  if (diet) parts.push(`diet=${diet}`);
  if (without.length > 0) parts.push(`without=${without.join(',')}`);
  return parts.length > 0 ? `?${parts.join('&')}` : '';
}

export function hasActiveFilters({ q, diet, without }: MenuFilters): boolean {
  return q.trim() !== '' || diet !== null || without.length > 0;
}

/** Adds or removes one allergen, keeping the canonical order. */
export function toggleAllergen(without: readonly Allergen[], allergen: Allergen): Allergen[] {
  const next = new Set(without);
  if (next.has(allergen)) next.delete(allergen);
  else next.add(allergen);
  return ALLERGENS.filter((a) => next.has(a));
}

/** Items bucketed by course, every course present (possibly empty), in eating order. */
export function groupByCourse(items: readonly MenuItem[]): Array<{ course: MenuCourse; items: MenuItem[] }> {
  return MENU_COURSES.map((course) => ({
    course,
    items: items.filter((item) => item.course === course),
  }));
}

/**
 * The home page teaser: a few dishes that together read as a day.
 *
 * Takes the first dish of each course in eating order, then goes round again
 * for second dishes until `count` is reached — so four dishes span four
 * courses when there are four courses to span, and a menu that only has
 * lunches still fills the row. The result stays in eating order. Within a
 * course the API's own sortOrder is kept, which is the admin's choice of what
 * leads.
 */
export function selectTeaserDishes(items: readonly MenuItem[], count = 4): MenuItem[] {
  if (count <= 0) return [];
  const byCourse = groupByCourse(items).map((g) => g.items);
  const picked = new Set<MenuItem>();

  for (let round = 0; picked.size < count; round++) {
    let tookAny = false;
    for (const dishes of byCourse) {
      if (picked.size >= count) break;
      const dish = dishes[round];
      if (!dish) continue;
      picked.add(dish);
      tookAny = true;
    }
    if (!tookAny) break;
  }

  // Back into eating order: round two's breakfast belongs before round one's dinner.
  return groupByCourse([...picked]).flatMap((g) => g.items);
}
