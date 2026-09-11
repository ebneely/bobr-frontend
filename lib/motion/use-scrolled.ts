'use client';

import { useSyncExternalStore } from 'react';

/**
 * True once the page has scrolled past `threshold` pixels.
 *
 * The scroll position is an external store, so `useSyncExternalStore` reads it
 * during render rather than setting state from an effect — which would render
 * the un-stuck header first and correct it a frame later, a visible flicker on
 * any page loaded already scrolled (a refresh, or a back navigation).
 *
 * The listener is passive: this handler will never preventDefault, and saying
 * so keeps it off the scroll's critical path.
 */
export function useScrolled(threshold = 24): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.scrollY > threshold,
    () => false,
  );
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener('scroll', onChange, { passive: true });
  return () => window.removeEventListener('scroll', onChange);
}
