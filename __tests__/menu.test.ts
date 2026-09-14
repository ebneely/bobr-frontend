import { menuSearchString, type MenuCourse, type MenuItem } from '@/lib/api/menu';
import {
  EMPTY_MENU_FILTERS,
  MENU_QUERY_MAX,
  hasActiveFilters,
  parseMenuFilters,
  selectTeaserDishes,
  serializeMenuFilters,
  toggleAllergen,
} from '@/lib/menu';

function dish(id: string, course: MenuCourse): MenuItem {
  return {
    id,
    course,
    name: id,
    description: null,
    namePl: id,
    nameEn: id,
    descriptionPl: null,
    descriptionEn: null,
    diet: null,
    mealId: null,
    kcal: null,
    proteinG: null,
    fatG: null,
    carbsG: null,
    allergens: [],
    tags: [],
    imageUrl: null,
  };
}

describe('menu URL query → filters', () => {
  it('reads q, diet and without from URLSearchParams', () => {
    const f = parseMenuFilters(new URLSearchParams('q=owsianka&diet=KETOGENIC&without=MILK,GLUTEN'));
    expect(f).toEqual({ q: 'owsianka', diet: 'KETOGENIC', without: ['GLUTEN', 'MILK'] });
  });

  it('reads the record Next hands a server page, taking the first of repeated keys', () => {
    const f = parseMenuFilters({ q: ['jajko', 'x'], diet: 'gluten_free', without: undefined });
    expect(f).toEqual({ q: 'jajko', diet: 'GLUTEN_FREE', without: [] });
  });

  it('is empty for no params at all', () => {
    expect(parseMenuFilters(null)).toEqual(EMPTY_MENU_FILTERS);
    expect(parseMenuFilters(new URLSearchParams(''))).toEqual(EMPTY_MENU_FILTERS);
  });

  it('drops values the API would answer with a 422', () => {
    const f = parseMenuFilters(new URLSearchParams('diet=CONSULTATION&without=PINEAPPLE,,eggs, soy '));
    expect(f.diet).toBeNull();
    expect(f.without).toEqual(['EGGS', 'SOY']);
  });

  it('dedupes allergens and puts them in the contract order', () => {
    const f = parseMenuFilters(new URLSearchParams('without=MOLLUSCS,GLUTEN,MOLLUSCS,milk'));
    expect(f.without).toEqual(['GLUTEN', 'MILK', 'MOLLUSCS']);
  });

  it('trims the query and caps its length', () => {
    expect(parseMenuFilters(new URLSearchParams('q=%20%20żurek%20')).q).toBe('żurek');
    expect(parseMenuFilters(new URLSearchParams(`q=${'a'.repeat(200)}`)).q).toHaveLength(MENU_QUERY_MAX);
  });
});

describe('filters → menu URL query', () => {
  it('writes nothing for an unfiltered menu', () => {
    expect(serializeMenuFilters(EMPTY_MENU_FILTERS)).toBe('');
    expect(serializeMenuFilters({ q: '   ', diet: null, without: [] })).toBe('');
  });

  it('keeps commas literal and encodes the query', () => {
    expect(
      serializeMenuFilters({ q: 'pieczony łosoś', diet: 'ALLERGIES', without: ['GLUTEN', 'FISH'] }),
    ).toBe('?q=pieczony%20%C5%82oso%C5%9B&diet=ALLERGIES&without=GLUTEN,FISH');
  });

  it('round-trips through parse unchanged', () => {
    const filters = { q: 'kasza & jaglana', diet: 'KETOGENIC' as const, without: ['EGGS', 'NUTS'] as const };
    const url = serializeMenuFilters({ ...filters, without: [...filters.without] });
    expect(parseMenuFilters(new URLSearchParams(url.slice(1)))).toEqual({
      ...filters,
      without: [...filters.without],
    });
  });

  it('knows when anything is filtered', () => {
    expect(hasActiveFilters(EMPTY_MENU_FILTERS)).toBe(false);
    expect(hasActiveFilters({ ...EMPTY_MENU_FILTERS, q: ' x ' })).toBe(true);
    expect(hasActiveFilters({ ...EMPTY_MENU_FILTERS, diet: 'KETOGENIC' })).toBe(true);
    expect(hasActiveFilters({ ...EMPTY_MENU_FILTERS, without: ['SOY'] })).toBe(true);
  });

  it('toggles an allergen in and out, keeping canonical order', () => {
    expect(toggleAllergen(['MILK'], 'GLUTEN')).toEqual(['GLUTEN', 'MILK']);
    expect(toggleAllergen(['GLUTEN', 'MILK'], 'GLUTEN')).toEqual(['MILK']);
  });

  it('builds the API query string with every empty value left out', () => {
    expect(menuSearchString({})).toBe('');
    expect(menuSearchString({ q: ' ', diet: null, without: [], locale: 'pl' })).toBe('?locale=pl');
    expect(menuSearchString({ q: 'jajko', course: 'LUNCH', without: ['GLUTEN', 'MILK'] })).toBe(
      '?q=jajko&course=LUNCH&without=GLUTEN%2CMILK',
    );
  });
});

describe('home teaser selection', () => {
  const menu = [
    dish('b1', 'BREAKFAST'),
    dish('b2', 'BREAKFAST'),
    dish('s1', 'SECOND_BREAKFAST'),
    dish('l1', 'LUNCH'),
    dish('l2', 'LUNCH'),
    dish('k1', 'SNACK'),
    dish('d1', 'DINNER'),
  ];
  const ids = (items: MenuItem[]) => items.map((i) => i.id);

  it('takes one dish per course in eating order', () => {
    expect(ids(selectTeaserDishes(menu, 4))).toEqual(['b1', 's1', 'l1', 'k1']);
    expect(ids(selectTeaserDishes(menu, 5))).toEqual(['b1', 's1', 'l1', 'k1', 'd1']);
  });

  it('goes round again when there are fewer courses than slots, and stays in eating order', () => {
    const few = [dish('l1', 'LUNCH'), dish('d1', 'DINNER'), dish('b1', 'BREAKFAST'), dish('d2', 'DINNER')];
    expect(ids(selectTeaserDishes(few, 4))).toEqual(['b1', 'l1', 'd1', 'd2']);
    expect(ids(selectTeaserDishes(menu, 7))).toEqual(['b1', 'b2', 's1', 'l1', 'l2', 'k1', 'd1']);
  });

  it('fills a lunch-only menu from that one course', () => {
    const lunches = [dish('l1', 'LUNCH'), dish('l2', 'LUNCH'), dish('l3', 'LUNCH'), dish('l4', 'LUNCH'), dish('l5', 'LUNCH')];
    expect(ids(selectTeaserDishes(lunches, 4))).toEqual(['l1', 'l2', 'l3', 'l4']);
  });

  it('returns what there is when the menu is short, and nothing when it is empty', () => {
    expect(ids(selectTeaserDishes([dish('k1', 'SNACK')], 4))).toEqual(['k1']);
    expect(selectTeaserDishes([], 4)).toEqual([]);
    expect(selectTeaserDishes(menu, 0)).toEqual([]);
  });
});
