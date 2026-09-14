'use client';

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
} from 'react';
import { useTranslations } from 'next-intl';

import { ApiError, formatApiError } from '@/lib/api/client';
import { useApiErrorTranslate } from '@/lib/api/use-api-error';
import {
  ALLERGENS,
  MENU_DIETS,
  type Allergen,
  type MenuCourse,
  type MenuDiet,
  type MenuItem,
} from '@/lib/api/menu';
import {
  MENU_QUERY_MAX,
  groupByCourse,
  hasActiveFilters,
  serializeMenuFilters,
  toggleAllergen,
  type MenuFilters,
} from '@/lib/menu';
import { useDebouncedValue, useMenu } from '@/lib/hooks/use-menu';
import { getLenis } from '@/components/motion/SmoothScroll';
import { DishCard } from '@/components/menu/DishCard';
import { DishDialog } from '@/components/menu/DishDialog';
import { PrintedMenuCard } from '@/components/menu/PrintedMenuCard';
import { MenuEmpty, MenuError, MenuNoResults, MenuSkeleton } from '@/components/menu/MenuStates';
import { CheckIcon, CloseIcon, SearchIcon, WithoutIcon } from '@/components/menu/MenuIcons';

/** Typing pauses shorter than this are still one search. */
const SEARCH_DEBOUNCE_MS = 250;

/**
 * The allergens most people filter by, always visible. The other eight sit
 * behind "more" — fourteen toggles in a row is a wall on a phone.
 */
const PRIMARY_ALLERGENS: readonly Allergen[] = ['GLUTEN', 'MILK', 'EGGS', 'NUTS', 'PEANUTS', 'SOY'];

/**
 * The menu page's client half: search, filters, the day of courses and the
 * printed menu.
 *
 * Filter state lives here and is mirrored INTO the URL with
 * history.replaceState — not router.replace, which would make a server round
 * trip for every keystroke. Replace rather than push, so Back leaves the menu
 * instead of stepping through every letter typed. Filtering itself is the
 * API's job (`/v1/menu?q=&diet=&without=`); nothing is filtered in the browser.
 */
export function MenuClient({ initialFilters }: { initialFilters: MenuFilters }) {
  const t = useTranslations('menu');
  const tErrors = useTranslations('errors');
  const translateError = useApiErrorTranslate();

  const [input, setInput] = useState(initialFilters.q);
  const [diet, setDiet] = useState<MenuDiet | null>(initialFilters.diet);
  const [without, setWithout] = useState<Allergen[]>(initialFilters.without);
  const [openDish, setOpenDish] = useState<MenuItem | null>(null);

  const debounced = useDebouncedValue(input, SEARCH_DEBOUNCE_MS);
  // Clearing is applied at once: there is nothing to wait for, and a cleared
  // field that still shows filtered results for a beat reads as broken.
  const q = (input.trim() === '' ? '' : debounced).trim().slice(0, MENU_QUERY_MAX);

  const filters = useMemo<MenuFilters>(() => ({ q, diet, without }), [q, diet, without]);
  const active = hasActiveFilters(filters);

  useEffect(() => {
    const { pathname, search, hash } = window.location;
    const next = serializeMenuFilters(filters);
    if (next !== search) window.history.replaceState(null, '', `${pathname}${next}${hash}`);
  }, [filters]);

  const { data, error, isPending, isPlaceholderData, refetch } = useMenu(filters);

  const clearAll = () => {
    setInput('');
    setDiet(null);
    setWithout([]);
  };

  const items = data?.items ?? [];
  // A menu with nothing on it and nothing filtered has nothing to search.
  const menuIsEmpty = !!data && !active && items.length === 0 && !isPlaceholderData;

  let content;
  if (isPending) {
    content = <MenuSkeleton />;
  } else if (error && !data) {
    const message =
      error instanceof ApiError
        ? formatApiError(error.body, translateError)
        : tErrors('network');
    content = <MenuError message={message} onRetry={() => void refetch()} />;
  } else if (menuIsEmpty) {
    content = <MenuEmpty />;
  } else if (items.length === 0) {
    content = <MenuNoResults query={q} onClear={clearAll} />;
  } else {
    content = (
      <DayOfEating
        items={items}
        filtered={active}
        stale={isPlaceholderData}
        onOpen={setOpenDish}
      />
    );
  }

  return (
    <div className="bobr-menu-layout" data-has-doc={data?.document ? 'true' : 'false'}>
      {/* Nothing to search in an empty menu, nor in one that failed to load —
          there the retry is the only useful control, so it leads. */}
      {!menuIsEmpty && !(error && !data) && (
        <div className="bobr-menu-layout__search">
          <SearchPanel
            input={input}
            onInput={setInput}
            diet={diet}
            onDiet={setDiet}
            without={without}
            onWithout={setWithout}
          />

          <div className="bobr-menu-status">
            <p className="bobr-menu-status__count" aria-live="polite" aria-atomic="true">
              {data && !error
                ? active
                  ? t('countFiltered', { count: items.length })
                  : t('countAll', { count: items.length })
                : ''}
            </p>
            {isPlaceholderData && (
              <span className="bobr-menu-status__updating" aria-hidden>
                {t('updating')}
              </span>
            )}
            {active && (
              <button type="button" className="bobr-textbtn" onClick={clearAll}>
                {t('clearFilters')}
              </button>
            )}
          </div>
        </div>
      )}

      {data?.document && (
        <aside className="bobr-menu-layout__aside">
          <PrintedMenuCard document={data.document} />
        </aside>
      )}

      <div className="bobr-menu-layout__day">{content}</div>

      <DishDialog item={openDish} onClose={() => setOpenDish(null)} />
    </div>
  );
}

function SearchPanel({
  input,
  onInput,
  diet,
  onDiet,
  without,
  onWithout,
}: {
  input: string;
  onInput: (v: string) => void;
  diet: MenuDiet | null;
  onDiet: (d: MenuDiet | null) => void;
  without: Allergen[];
  onWithout: (a: Allergen[]) => void;
}) {
  const t = useTranslations('menu');
  const ids = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Start expanded when a shared link already hides one of the tucked-away
  // allergens, or that pressed toggle would be invisible.
  const [expanded, setExpanded] = useState(() =>
    without.some((a) => !PRIMARY_ALLERGENS.includes(a)),
  );
  const secondaryCount = ALLERGENS.length - PRIMARY_ALLERGENS.length;
  const visibleAllergens = ALLERGENS.filter(
    (a) => expanded || PRIMARY_ALLERGENS.includes(a) || without.includes(a),
  );

  return (
    <form
      role="search"
      className="bobr-menu-search"
      onSubmit={(e) => {
        // Results already follow the typing; Enter only closes the keyboard.
        e.preventDefault();
        inputRef.current?.blur();
      }}
    >
      <label htmlFor={`${ids}-q`} className="bobr-sr-only">
        {t('searchLabel')}
      </label>
      <div className="bobr-search-field">
        <span className="bobr-search-field__offset" aria-hidden />
        <div className="bobr-search-field__face">
          <SearchIcon />
          <input
            ref={inputRef}
            id={`${ids}-q`}
            type="search"
            value={input}
            onChange={(e) => onInput(e.target.value)}
            placeholder={t('searchPlaceholder')}
            maxLength={MENU_QUERY_MAX}
            autoComplete="off"
            spellCheck={false}
            enterKeyHint="search"
          />
          {input && (
            <button
              type="button"
              className="bobr-search-field__clear"
              aria-label={t('searchClear')}
              onClick={() => {
                onInput('');
                inputRef.current?.focus();
              }}
            >
              <CloseIcon />
            </button>
          )}
        </div>
      </div>

      <div className="bobr-filter-row" role="group" aria-labelledby={`${ids}-diet`}>
        <span id={`${ids}-diet`} className="bobr-filter-row__label">
          {t('dietLabel')}
        </span>
        <div className="bobr-chips">
          {MENU_DIETS.map((d) => (
            <button
              key={d}
              type="button"
              className="bobr-chip"
              aria-pressed={diet === d}
              onClick={() => onDiet(diet === d ? null : d)}
            >
              <span className="bobr-chip__icon">
                <CheckIcon />
              </span>
              {t(`diet.${d}`)}
            </button>
          ))}
        </div>
      </div>

      <div
        className="bobr-filter-row"
        role="group"
        aria-labelledby={`${ids}-without`}
        aria-describedby={`${ids}-without-hint`}
      >
        <span id={`${ids}-without`} className="bobr-filter-row__label">
          {t('withoutLabel')}
        </span>
        <div className="bobr-chips">
          {visibleAllergens.map((a) => (
            <button
              key={a}
              type="button"
              className="bobr-chip bobr-chip--without"
              aria-pressed={without.includes(a)}
              onClick={() => onWithout(toggleAllergen(without, a))}
            >
              <span className="bobr-chip__icon">
                <WithoutIcon />
              </span>
              {t(`allergen.${a}`)}
            </button>
          ))}
          <button
            type="button"
            className="bobr-textbtn bobr-chips__more"
            aria-expanded={expanded}
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? t('allergensLess') : t('allergensMore', { count: secondaryCount })}
          </button>
        </div>
        <p id={`${ids}-without-hint`} className="bobr-filter-row__hint">
          {t('withoutHint')}
        </p>
      </div>
    </form>
  );
}

/**
 * The dishes as a day: one section per course in eating order, strung on a
 * vertical line with a numbered stop for each meal.
 *
 * While filtering, a course with no matches stays on the line, collapsed, so
 * the shape of the day survives the search — "nothing for breakfast" is itself
 * an answer. Unfiltered, a course the kitchen has not filled is simply left out.
 */
function DayOfEating({
  items,
  filtered,
  stale,
  onOpen,
}: {
  items: MenuItem[];
  filtered: boolean;
  stale: boolean;
  onOpen: (item: MenuItem) => void;
}) {
  const t = useTranslations('menu');
  const groups = groupByCourse(items).filter((g) => filtered || g.items.length > 0);
  const [current, setCurrent] = useState<MenuCourse | null>(null);
  const navRef = useRef<HTMLElement | null>(null);

  const courseKey = groups.map((g) => g.course).join(',');
  useEffect(() => {
    const els = courseKey
      .split(',')
      .map((c) => document.getElementById(`course-${c}`))
      .filter((el): el is HTMLElement => el !== null);
    if (els.length === 0) return;

    // The course crossing a line a little under the sticky bar is "now".
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setCurrent(entry.target.id.replace('course-', '') as MenuCourse);
          }
        }
      },
      { rootMargin: '-30% 0px -60% 0px' },
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [courseKey]);

  const jump = (e: MouseEvent<HTMLAnchorElement>, course: MenuCourse) => {
    const target = document.getElementById(`course-${course}`);
    if (!target) return;
    e.preventDefault();
    const header = parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue('--bobr-header-h'),
    );
    const offset = -((Number.isFinite(header) ? header : 62) + (navRef.current?.offsetHeight ?? 0) + 16);
    const lenis = getLenis();
    if (lenis) {
      // Filtering changes the page height; Lenis caches its scroll limit and
      // would otherwise stop short of a course that only just reappeared.
      lenis.resize();
      lenis.scrollTo(target, { offset });
    }
    else target.scrollIntoView({ block: 'start' });
    // Move focus with the view, so the next Tab continues inside that course.
    target.querySelector<HTMLElement>('h2')?.focus({ preventScroll: true });
    setCurrent(course);
  };

  return (
    <div className="bobr-day-wrap" data-stale={stale ? 'true' : 'false'}>
      <nav ref={navRef} className="bobr-course-nav" aria-label={t('courseNav')}>
        <ul>
          {groups.map((g) => (
            <li key={g.course}>
              <a
                href={`#course-${g.course}`}
                className="bobr-course-nav__link"
                data-active={current === g.course ? 'true' : undefined}
                data-empty={g.items.length === 0 ? 'true' : undefined}
                aria-current={current === g.course ? 'location' : undefined}
                onClick={(e) => jump(e, g.course)}
              >
                {t(`course.${g.course}`)}
                <span className="bobr-course-nav__count">{g.items.length}</span>
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <ol className="bobr-day">
        {groups.map((g, i) => (
          <li
            key={g.course}
            id={`course-${g.course}`}
            className="bobr-course"
            data-empty={g.items.length === 0 ? 'true' : undefined}
          >
            <span className="bobr-course__stop" aria-hidden>
              {String(i + 1).padStart(2, '0')}
            </span>
            <section className="bobr-course__content" aria-labelledby={`course-${g.course}-title`}>
              <header className="bobr-course__head">
                <h2 id={`course-${g.course}-title`} className="bobr-course__title" tabIndex={-1}>
                  {t(`course.${g.course}`)}
                </h2>
                <span className="bobr-course__count">
                  {t('courseCount', { count: g.items.length })}
                </span>
              </header>
              {g.items.length > 0 ? (
                <ul className="bobr-dish-grid">
                  {g.items.map((item) => (
                    <li key={item.id}>
                      <DishCard item={item} onOpen={onOpen} />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="bobr-course__empty">{t('courseEmpty')}</p>
              )}
            </section>
          </li>
        ))}
      </ol>
    </div>
  );
}
