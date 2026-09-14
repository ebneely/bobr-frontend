'use client';

import { useEffect, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useLocale } from 'next-intl';

import { apiGetMenu } from '@/lib/api/menu';
import type { MenuFilters } from '@/lib/menu';

export const menuKeys = {
  all: ['menu'] as const,
  list: (locale: string, filters: MenuFilters) =>
    [...menuKeys.all, locale, filters.q.trim(), filters.diet, filters.without.join(',')] as const,
};

/**
 * The public menu, filtered on the server.
 *
 * `keepPreviousData` so the dishes already on screen stay there while the next
 * filter's answer is on its way — blanking the list on every keystroke would
 * make the page flicker between a skeleton and results as someone types.
 */
export function useMenu(filters: MenuFilters) {
  const locale = useLocale();
  return useQuery({
    queryKey: menuKeys.list(locale, filters),
    queryFn: ({ signal }) =>
      apiGetMenu(
        { q: filters.q, diet: filters.diet, without: filters.without, locale },
        { signal },
      ),
    placeholderData: keepPreviousData,
  });
}

/** `value`, but only once it has stopped changing for `delayMs`. */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}
