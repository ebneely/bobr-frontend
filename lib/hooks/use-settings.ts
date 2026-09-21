'use client';

import { useQuery } from '@tanstack/react-query';

import { apiGetClosedDays, apiGetPublicSettings } from '@/lib/api/settings';

export const settingsKeys = {
  public: ['settings', 'public'] as const,
  closedDays: (from: string) => ['settings', 'closed-days', from] as const,
};

/** The admin-edited storefront settings; the API caches them for 60 s too. */
export function usePublicSettings() {
  return useQuery({
    queryKey: settingsKeys.public,
    queryFn: ({ signal }) => apiGetPublicSettings(signal),
    staleTime: 60_000,
  });
}

/** Closed days from `from` onwards, as a Set for O(1) calendar lookups. */
export function useClosedDays(from: string) {
  return useQuery({
    queryKey: settingsKeys.closedDays(from),
    queryFn: ({ signal }) => apiGetClosedDays(from, signal),
    select: (days) => new Set(days),
    staleTime: 60_000,
  });
}
