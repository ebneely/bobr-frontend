'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiListMeals } from '@/lib/api/meals';
import { apiPlaceOrder, apiQuoteOrder, type PlaceOrderInput } from '@/lib/api/orders';
import { accountKeys } from '@/lib/hooks/use-account';
import { useDebouncedValue } from '@/lib/hooks/use-menu';
import type { QuoteQueryView, QuoteRequest } from '@/lib/order-quote';

export const orderKeys = {
  meals: ['meals'] as const,
  quote: (key: string) => ['orders', 'quote', key] as const,
};

/** How long the selection must stop changing before a new quote is asked for. */
const QUOTE_DEBOUNCE_MS = 350;

/** The active meals with their per-day price. Public. */
export function useMeals() {
  return useQuery({
    queryKey: orderKeys.meals,
    queryFn: ({ signal }) => apiListMeals(signal),
  });
}

/**
 * The live quote for the order as currently drafted.
 *
 * Debounced, so ticking a whole month is one request, not thirty. The previous
 * answer stays on screen while the next is fetched (`keepPreviousData`), and
 * `summaryState` marks it not-fresh so the pay button waits for the real one.
 * A refusal is an answer, not a transient failure: never retried.
 */
export function useOrderQuote(request: QuoteRequest): QuoteQueryView {
  const currentKey = request.ready ? request.key : null;
  // Debounced on the KEY, a string: a fresh object every render would restart
  // the timer on every render and never settle.
  const debouncedKey = useDebouncedValue(currentKey, QUOTE_DEBOUNCE_MS);
  // Only ask about a body that still matches what is on screen.
  const active = request.ready && debouncedKey === request.key ? request : null;

  const query = useQuery({
    queryKey: orderKeys.quote(active?.key ?? 'none'),
    queryFn: ({ signal }) => apiQuoteOrder((active as { input: PlaceOrderInput }).input, signal),
    enabled: Boolean(active),
    placeholderData: keepPreviousData,
    retry: false,
    // A quote is only good for the moment it was asked: prices, zones and the
    // earliest delivery day can all change underneath it.
    staleTime: 0,
    gcTime: 60 * 1000,
  });

  return {
    key: active?.key ?? null,
    data: query.data,
    error: query.error,
    isPlaceholderData: query.isPlaceholderData,
    isFetching: query.isFetching,
  };
}

/** Places the order; the account area's order list is out of date afterwards. */
export function usePlaceOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: PlaceOrderInput) => apiPlaceOrder(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: accountKeys.orders() }),
  });
}
