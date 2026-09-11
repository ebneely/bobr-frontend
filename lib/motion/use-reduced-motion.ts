'use client';

import { useSyncExternalStore } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

/**
 * Tracks the OS "reduce motion" setting, and keeps tracking it — a user can
 * flip it without reloading, and a hook that read it once would keep animating
 * for the rest of the session.
 *
 * `useSyncExternalStore` rather than useState + useEffect: matchMedia IS an
 * external store, and this is the primitive built for one. It also reads the
 * real value during the first client render instead of rendering `false` and
 * then setting state in an effect, which would cost a second render and make
 * every animation flash on before being turned off.
 *
 * Every consumer must be CORRECT when this is true, not merely faster — a
 * reveal that never fires with motion off is missing content, not calm content.
 */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

function subscribe(onChange: () => void): () => void {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener('change', onChange);
  return () => mq.removeEventListener('change', onChange);
}

function getSnapshot(): boolean {
  return window.matchMedia(QUERY).matches;
}

/**
 * The server cannot know the preference, and guessing "reduce" would ship
 * static HTML to everyone. False keeps the server and first client render in
 * agreement for the common case; anyone who has set the preference gets it
 * applied on that same first client render, before paint.
 */
function getServerSnapshot(): boolean {
  return false;
}
