'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ApiError } from '@/lib/api/client';
import { apiListMyConsultations } from '@/lib/api/consultations';
import { apiGetMyIntake, type IntakeProfile } from '@/lib/api/intake';
import { apiGetMe, apiUpdateMe, type UpdateMeInput } from '@/lib/api/me';
import {
  apiCancelOrder,
  apiGetMyOrder,
  apiListMyNotes,
  apiListMyOrders,
  apiMoveDay,
  apiRaiseNote,
  apiSkipDay,
  apiTrackDay,
  type Consumption,
  type NoteKind,
} from '@/lib/api/orders';
import { apiGetPaymentSettings } from '@/lib/api/settings';
import { apiCreateWeightEntry, apiListWeightEntries, type CreateWeightEntryInput } from '@/lib/api/weight';

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
  me: () => [...accountKeys.all, 'me'] as const,
  weight: () => [...accountKeys.all, 'weight'] as const,
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

/** G09 — the customer's own profile: name, phone, language. */
export function useMe(enabled = true) {
  return useQuery({
    queryKey: accountKeys.me(),
    queryFn: apiGetMe,
    enabled,
    retry: retryUnlessFinal,
  });
}

export function useUpdateMe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateMeInput) => apiUpdateMe(input),
    onSuccess: (me) => qc.setQueryData(accountKeys.me(), me),
  });
}

/** G32 — weight check-ins, newest first. */
export function useMyWeight() {
  return useQuery({
    queryKey: accountKeys.weight(),
    queryFn: apiListWeightEntries,
    staleTime: FRESH,
    retry: retryUnlessFinal,
  });
}

export function useAddWeightEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateWeightEntryInput) => apiCreateWeightEntry(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: accountKeys.weight() }),
  });
}

/**
 * G19 — skip / move / cancel a delivery day. Every one of these answers with
 * the WHOLE order (the backend re-derives it), so the mutation writes that
 * order straight into the cache rather than only invalidating: the day list
 * updates in the same tick the mutation resolves, with no refetch flash.
 */
function useOrderWrite<TVars>(mutationFn: (vars: TVars) => ReturnType<typeof apiGetMyOrder>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (order) => {
      qc.setQueryData(accountKeys.order(order.id), order);
      void qc.invalidateQueries({ queryKey: accountKeys.orders() });
    },
  });
}

export function useSkipDay() {
  return useOrderWrite((vars: { orderId: string; dayId: string }) =>
    apiSkipDay(vars.orderId, vars.dayId),
  );
}

export function useMoveDay() {
  return useOrderWrite((vars: { orderId: string; dayId: string; to: string }) =>
    apiMoveDay(vars.orderId, vars.dayId, vars.to),
  );
}

export function useCancelOrder() {
  return useOrderWrite((vars: { orderId: string; reason: string }) =>
    apiCancelOrder(vars.orderId, vars.reason),
  );
}

/** G31 — meal tracking on one delivery day. Refetches the order it belongs to. */
export function useTrackDay(orderId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { dayId: string; consumption: Consumption; note?: string | null }) =>
      apiTrackDay(vars.dayId, vars.consumption, vars.note),
    onSuccess: () => qc.invalidateQueries({ queryKey: accountKeys.order(orderId) }),
  });
}
