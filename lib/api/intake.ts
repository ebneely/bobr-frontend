import { apiFetch } from './client';
import type { Allergen } from './menu';

/**
 * The pre-purchase intake gate.
 *
 * Mirrors `bobr_backend/src/intake/`. Every route is `/me` — the API takes the
 * identity from the session and offers no way to name a different user, so
 * there is deliberately nothing here that accepts an id either.
 */

export type ActivityType =
  | 'NONE'
  | 'GYM'
  | 'SWIMMER'
  | 'BOXING_MMA'
  | 'OTHER';

export type PhotoPosition = 'FRONT' | 'BACK' | 'LEFT' | 'RIGHT';

export const PHOTO_POSITIONS: readonly PhotoPosition[] = [
  'FRONT',
  'BACK',
  'LEFT',
  'RIGHT',
] as const;

export interface IntakeProfile {
  weightKg: string | number;
  heightCm: string | number;
  bodyComposition: string | null;
  activityTypes: ActivityType[];
  activityOther: string | null;
  /** G15 — the allergens the kitchen must exclude. */
  allergens: Allergen[];
  /** G15 — free text for anything the enum does not capture. */
  dietaryNotes: string | null;
  /** Non-null means checkout is unlocked. This is the gate. */
  completedAt: string | null;
  /** Which of the four are still missing — drives the upload checklist. */
  missingPhotos: PhotoPosition[];
  /**
   * Relative, session-authenticated paths (`/v1/intake/photos/FRONT`), never
   * an absolute URL — see `apiAssetUrl` in `lib/api/client.ts` for turning one
   * of these into something an `<img>` can load.
   */
  photos: Partial<Record<PhotoPosition, string | null>>;
}

export interface IntakeProfileInput {
  weightKg: number;
  heightCm: number;
  bodyComposition?: string | null;
  activityTypes: ActivityType[];
  activityOther?: string | null;
  allergens: Allergen[];
  dietaryNotes?: string | null;
}

/** Throws ApiError with status 404 when the customer has no profile yet. */
export function apiGetMyIntake() {
  return apiFetch<IntakeProfile>('/intake/me');
}

export function apiSaveMyIntake(input: IntakeProfileInput) {
  return apiFetch<IntakeProfile>('/intake/me', {
    method: 'PUT',
    body: input,
  });
}

/**
 * Uploads one photo as multipart.
 *
 * `apiFetch` omits Content-Type for FormData on purpose — the browser has to
 * set its own multipart boundary, and overriding it makes the body unparseable
 * on the server with no useful error.
 */
export function apiUploadIntakePhoto(position: PhotoPosition, file: File) {
  const body = new FormData();
  body.append('file', file);

  return apiFetch<IntakeProfile>(
    `/intake/me/photos/${position.toLowerCase()}`,
    { method: 'POST', body },
  );
}
