// Server components only — imports `server-session`, which reads next/headers.
import type { Meal } from './meals';
import { apiOrigin } from './server-session';

/** How long the home page may show a cached price list, in seconds. */
const MEALS_REVALIDATE_S = 300;

/**
 * The active meals for a server-rendered section (the home diets carousel).
 *
 * Never throws: an API that is down or empty yields `[]`, and the caller falls
 * back to its static copy rather than taking the whole home page down.
 */
export async function getMealsForServer(): Promise<Meal[]> {
  try {
    const res = await fetch(`${apiOrigin()}/v1/meals`, {
      next: { revalidate: MEALS_REVALIDATE_S },
    });
    if (!res.ok) return [];
    const body = (await res.json().catch(() => null)) as unknown;
    return Array.isArray(body) ? (body as Meal[]) : [];
  } catch {
    return [];
  }
}
