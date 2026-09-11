'use client';

import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from '@/lib/motion/use-reduced-motion';

interface CounterProps {
  /** Value to count up to. */
  to: number;
  from?: number;
  /** Static sibling, e.g. "+". Never part of the animated node, so it cannot shift. */
  suffix?: string;
  /** Seconds. Short targets want less than the 2s a three-digit count needs. */
  duration?: number;
  className?: string;
}

/** Decelerating curve. Fast at the start, settling onto the final value. */
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * A number that counts up when it first scrolls into view.
 *
 * Driven by a rAF loop writing `textContent` directly rather than by React
 * state: at 60fps a two-second count is ~120 renders of a subtree that only
 * ever changes one text node, and going through the reconciler for each is
 * work with no benefit.
 *
 * Fires at 20% visibility and unobserves — it is an entrance, and a counter
 * that re-runs every time it scrolls back into view is a distraction.
 */
export function Counter({
  to,
  from = 0,
  suffix,
  duration = 2,
  className,
}: CounterProps) {
  const hostRef = useRef<HTMLSpanElement | null>(null);
  const numberRef = useRef<HTMLSpanElement | null>(null);
  const reduced = useReducedMotion();
  const [started, setStarted] = useState(false);

  useEffect(() => {
    // With motion off the number is simply the answer. A counter that never
    // runs must not be left sitting at its start value.
    if (reduced) {
      if (numberRef.current) numberRef.current.textContent = String(to);
      return;
    }

    const host = hostRef.current;
    if (!host || started) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setStarted(true);
        observer.disconnect();
      },
      { threshold: 0.2 },
    );

    observer.observe(host);
    return () => observer.disconnect();
  }, [reduced, to, started]);

  useEffect(() => {
    if (!started || reduced) return;

    const node = numberRef.current;
    if (!node) return;

    let frame = 0;
    const startTime = performance.now();
    const totalMs = duration * 1000;

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / totalMs);
      const value = from + (to - from) * easeOutCubic(progress);

      node.textContent = String(Math.round(value));

      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [started, reduced, from, to, duration]);

  return (
    <span
      ref={hostRef}
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'baseline',
        justifyContent: 'center',
        // Fixed-width digits. The real cause of a counter twitching is not
        // antialiasing, it is that proportional digits are different widths —
        // a 1 is narrower than a 4 — so the number reflows on almost every
        // frame. Tabular figures make every digit the same width, which stops
        // the jitter outright rather than just smoothing its edges.
        fontVariantNumeric: 'tabular-nums',
        WebkitFontSmoothing: 'antialiased',
      }}
    >
      {/* The animated node holds ONLY digits. The suffix is a sibling, so it
          stays put while the number underneath it changes. */}
      <span ref={numberRef}>{reduced ? to : from}</span>
      {suffix && <span aria-hidden>{suffix}</span>}
    </span>
  );
}
