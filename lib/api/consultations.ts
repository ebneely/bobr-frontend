import { apiFetch } from './client';

/**
 * Consultations with a doctor. Mirrors `bobr_backend/src/consultations/`.
 *
 * The client sends a context, a preferred instant and a note — never a price.
 * The price is frozen by the server on the row.
 */

export type ConsultationContext = 'BEFORE_MEAL' | 'BEFORE_PLAN';

export type ConsultationStatus =
  | 'REQUESTED'
  | 'CONFIRMED'
  | 'COMPLETED'
  | 'CANCELLED';

export interface Consultation {
  id: string;
  context: ConsultationContext;
  /** ISO instant the customer asked for. */
  preferredAt: string;
  note: string | null;
  /** Integer grosze. */
  priceGrosze: number;
  status: ConsultationStatus;
  scheduledAt: string | null;
  meetUrl: string | null;
  confirmedAt: string | null;
  createdAt: string;
}

/** The consultation price, for display before booking. The server freezes its own. */
export const CONSULTATION_PRICE_GROSZE = 10000;

/** Longest note the server accepts. */
export const CONSULTATION_NOTE_MAX = 1000;

export function apiBookConsultation(input: {
  context: ConsultationContext;
  preferredAt: string;
  note?: string;
}) {
  return apiFetch<Consultation>('/consultations', { method: 'POST', body: input });
}

export function apiListMyConsultations() {
  return apiFetch<Consultation[]>('/consultations');
}
