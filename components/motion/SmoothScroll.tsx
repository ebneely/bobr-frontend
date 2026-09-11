'use client';

import { useEffect } from 'react';
import Lenis from 'lenis';
import { useReducedMotion } from '@/lib/motion/use-reduced-motion';

let instance: Lenis | null = null;

/**
 * The live Lenis instance, or null when smooth scrolling is off (reduced
 * motion, or before mount).
 *
 * Exposed through a module accessor rather than `window.lenis`: Lenis already
 * declares a global of that name for its own use, and redeclaring it with a
 * different type is a compile error rather than a merge.
 *
 * Anything that needs to move the page should go through this — calling
 * `window.scrollTo` while Lenis is driving fights the rAF loop and lands in the
 * wrong place.
 */
export function getLenis(): Lenis | null {
  return instance;
}

/**
 * Lenis smooth scrolling, mounted once at the layout level.
 *
 * Lenis cancels the browser's own scroll and re-drives it from a rAF loop,
 * which means it owns the scroll position for the whole document. Two
 * instances fight each other, so this must never be rendered twice.
 */
export function SmoothScroll({ children }: { children: React.ReactNode }) {
  const reduced = useReducedMotion();

  useEffect(() => {
    // Smooth scrolling IS the motion someone asked to turn off — it delays
    // arrival at the place they asked to go. Native scrolling, in that case.
    if (reduced) return;

    const lenis = new Lenis({
      // ~1.05s to settle: long enough to read as gliding, short enough that a
      // wheel flick still feels direct.
      duration: 1.05,
      // Exponential ease-out. The steep start keeps the page responsive to the
      // input; the long tail is what makes it feel weighted.
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      wheelMultiplier: 1,
      // Touch is left native. Mobile browsers have their own momentum physics
      // and hardware-accelerated scrolling; overriding them costs battery and
      // reliably feels worse than the platform's own.
      syncTouch: false,
      touchMultiplier: 1.6,
      autoRaf: false,
    });

    instance = lenis;

    let frame = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      frame = requestAnimationFrame(raf);
    };
    frame = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(frame);
      lenis.destroy();
      instance = null;
    };
  }, [reduced]);

  return <>{children}</>;
}
