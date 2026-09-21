// Server components only — imports `server-session`, which reads next/headers.
import type { PublicSettings } from './settings';
import { apiOrigin } from './server-session';

/** Matches the API's own `Cache-Control: max-age=60` on this route. */
const SETTINGS_REVALIDATE_S = 60;

/**
 * The admin-edited settings for a server-rendered section.
 *
 * Never throws: an API that is down yields `null`, and each caller leaves out
 * the part that needs a value rather than printing a guessed one.
 */
export async function getPublicSettingsForServer(): Promise<PublicSettings | null> {
  try {
    const res = await fetch(`${apiOrigin()}/v1/settings/public`, {
      next: { revalidate: SETTINGS_REVALIDATE_S },
    });
    if (!res.ok) return null;
    const body = (await res.json().catch(() => null)) as { values?: PublicSettings } | null;
    return body?.values ?? null;
  } catch {
    return null;
  }
}
