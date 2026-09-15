'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ApiError } from '@/lib/api/client';
import { apiListMyConsultations } from '@/lib/api/consultations';
import { apiGetMyIntake, type IntakeProfile } from '@/lib/api/intake';
import {
  apiGetMyOrder,
  apiListMyNotes,
  apiListMyOrders,
  apiRaiseNote,
  type NoteKind,
} from '@/lib/api/orders';
import { apiGetPaymentSettings } from '@/lib/api/settings';

/**
 * The customer's own rows, for the account area. Every route is scoped by the
 * session on the server; nothing here names a user.
 *
 * A short staleTime rather than the app default: these are statuses someone
 * opens the page to check, and a minute-old "unpaid" after the admin marked it
 * paid is the wrong answer.
 */
const FRESH = 15 * 1000;

export const accountKeys = {
  all: ['account'] as const,
  orders: () => [...accountKeys.all, 'orders'] as const,
  order: (id: string) => [...accountKeys.all, 'orders', id] as const,
  consultations: () => [...accountKeys.all, 'consultations'] as const,
  notes: () => [...accountKeys.all, 'notes'] as const,
  intake: () => [...accountKeys.all, 'intake'] as const,
  payment: () => [...accountKeys.all, 'payment'] as const,
};

/** Never retry an auth or not-found answer: asking again will not change it. */
function retryUnlessFinal(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiError && [401, 403, 404].includes(error.status)) return false;
  return failureCount < 1;
}

export function useMyOrders() {
  return useQuery({
    queryKey: accountKeys.orders(),
    queryFn: apiListMyOrders,
    staleTime: FRESH,
    retry: retryUnlessFinal,
  });
}

export function useMyOrder(id: string) {
  return useQuery({
    queryKey: accountKeys.order(id),
    queryFn: () => apiGetMyOrder(id),
    staleTime: FRESH,
    retry: retryUnlessFinal,
  });
}

export function useMyConsultations() {
  return useQuery({
    queryKey: accountKeys.consultations(),
    queryFn: apiListMyConsultations,
    staleTime: FRESH,
    retry: retryUnlessFinal,
  });
}

export function useMyNotes() {
  return useQuery({
    queryKey: accountKeys.notes(),
    queryFn: apiListMyNotes,
    staleTime: FRESH,
    retry: retryUnlessFinal,
  });
}

/** `null` means no profile yet — the API answers that with a 404. */
export function useMyIntake() {
  return useQuery({
    queryKey: accountKeys.intake(),
    queryFn: async (): Promise<IntakeProfile | null> => {
      try {
        return await apiGetMyIntake();
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) return null;
        throw err;
      }
    },
    staleTime: FRESH,
    retry: retryUnlessFinal,
  });
}

/** The BLIK number and recipient. Changes rarely, so the app default applies. */
export function usePaymentSettings(enabled = true) {
  return useQuery({
    queryKey: accountKeys.payment(),
    queryFn: apiGetPaymentSettings,
    enabled,
    retry: retryUnlessFinal,
  });
}

export function useRaiseNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { kind: NoteKind; body: string; orderId?: string | null }) =>
      apiRaiseNote(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: accountKeys.notes() }),
  });
}
