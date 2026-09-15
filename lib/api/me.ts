import { apiFetch } from './client';

/**
 * The signed-in customer's own profile (G09). Mirrors `bobr_backend/src/me/`.
 * `phone` is normalised server-side to `+48XXXXXXXXX`; `locale` is the enum
 * better-auth's own `locale` field targets, and this is the only way a
 * customer can change it (`input: false` on the auth field).
 */

export type MeLocale = 'PL' | 'EN';

export interface Me {
  id: string;
  email: string;
  fullName: string | null;
  phone: string | null;
  locale: MeLocale;
  role: string;
  createdAt: string;
}

export interface UpdateMeInput {
  fullName?: string;
  phone?: string;
  locale?: MeLocale;
}

export function apiGetMe() {
  return apiFetch<Me>('/me');
}

/** At least one field is required — an empty body is `EMPTY_UPDATE`. */
export function apiUpdateMe(input: UpdateMeInput) {
  return apiFetch<Me>('/me', { method: 'PATCH', body: input });
}
