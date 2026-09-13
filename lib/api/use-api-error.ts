'use client';

import { useCallback } from 'react';
import { useTranslations } from 'next-intl';

import type { ApiErrorTranslate } from '@/lib/api/client';

const FIELD_PREFIX = 'field:';

/**
 * The next-intl half of `formatApiError(body, translate)`.
 *
 * - code `X` → `apiErrors.codes.X`, with the backend's params passed to ICU;
 * - `'field:<path>'` → `apiErrors.fields.<path with dots as _>` (next-intl
 *   reads a dot as nesting, and `delivery.postalCode` is one field, not two).
 *
 * Returns null for anything without a string, so the caller falls back to the
 * backend's English message rather than showing a raw key.
 */
export function useApiErrorTranslate(): ApiErrorTranslate {
  const t = useTranslations('apiErrors');

  return useCallback<ApiErrorTranslate>(
    (code, params) => {
      const key = code.startsWith(FIELD_PREFIX)
        ? `fields.${code.slice(FIELD_PREFIX.length).replace(/\./g, '_')}`
        : `codes.${code}`;
      if (!t.has(key)) return null;
      const out = t(key, params);
      // A formatting failure (e.g. a param the backend did not send) makes
      // next-intl hand back the key path itself — that must never reach a user.
      return out && out !== `apiErrors.${key}` ? out : null;
    },
    [t],
  );
}
