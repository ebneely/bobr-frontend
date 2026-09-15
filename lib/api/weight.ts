import { apiFetch } from './client';

/**
 * G32 — weight check-ins. Mirrors `bobr_backend/src/weight/`. One entry per
 * Warsaw calendar day; a second submission for the same day upserts rather
 * than creating a duplicate.
 */

export interface WeightEntry {
  id: string;
  /** `YYYY-MM-DD`, a Warsaw day. */
  measuredOn: string;
  weightKg: string | number;
  note: string | null;
  createdAt: string;
}

export interface CreateWeightEntryInput {
  weightKg: number;
  /** `YYYY-MM-DD`. Defaults to today in Warsaw when omitted. */
  measuredOn?: string;
  note?: string | null;
}

export function apiCreateWeightEntry(input: CreateWeightEntryInput) {
  return apiFetch<WeightEntry>('/weight', { method: 'POST', body: input });
}

/** Newest first. */
export function apiListWeightEntries() {
  return apiFetch<WeightEntry[]>('/weight');
}
