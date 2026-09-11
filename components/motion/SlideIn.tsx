'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useReducedMotion } from '@/lib/motion/use-reduced-motion';

interface SlideInProps {
  children: ReactNode;
  /**
   * Travel distance. Positive slides in from the right.
   *
   * Measured at 590px on the reference, which was ~41% of its 1440px viewport.
   * Expressed as a clamp here so it stays proportional: a literal 590px is most
   * of a phone screen, and the element would start so far out that the delay
   * plus the travel reads as the page being broken rather than as an entrance.
   */
  distance?: string;
  /** Seconds before the motion starts. */
  delay?: number;
  className?: string;
}

/**
 * Horizontal appear animation, fired once on mount.
 *
 * This is an "appear" effect, not a scroll reveal — it belongs to elements
 * above the fold that should animate as the page arrives, so there is no
 * IntersectionObserver here.
 *
 * The reference drives this with a spring at stiffness 120 / damping 60 / mass
 * 1. That works out to a damping ratio of about 2.7, which is heavily
 * overdamped — the motion never overshoots, it just decelerates onto its
 * resting place. A CSS easing curve reproduces that faithfully and costs no
 * JavaScript per frame, where a real spring integrator would run a rAF loop to
 * produce a curve that is visually identical.
 */
export function SlideIn({
  children,
  distance = 'clamp(120px, 41vw, 590px)',
  delay = 0.8,
  className,
}: SlideInProps) {
  const [armed, setArmed] = useState(false);
  const [settled, setSettled] = useState(false);
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement | null>(null);

  // Derived, not stored. With motion off the element is in place from the very
  // first render — an effect would render it 590px off-screen once and correct
  // it a frame later, which is the flash the preference exists to prevent.
  const shown = armed || reduced;

  useEffect(() => {
    if (reduced) return;

    // Two rAFs. One is not enough: the element has to be committed to the DOM
    // at its offset and have that painted before the class flips, or the
    // browser coalesces both states into one style computation, sees no change
    // to animate, and the element simply appears at its destination.
    let second = 0;
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => setArmed(true));
    });

    return () => {
      cancelAnimationFrame(first);
      cancelAnimationFrame(second);
    };
  }, [reduced]);

  return (
    <div
      ref={ref}
      className={className}
      onTransitionEnd={() => setSettled(true)}
      style={{
        // 0.001 rather than 0, matching the reference. A genuinely zero opacity
        // lets some browsers skip compositing the layer entirely, so the first
        // animated frame is the one that pays for creating it.
        opacity: shown ? 1 : 0.001,
        transform: shown
          ? 'translate3d(0, 0, 0)'
          : `translate3d(${distance}, 0, 0)`,
        transitionProperty: 'opacity, transform',
        transitionDuration: 'var(--bobr-duration-slow)',
        transitionTimingFunction: 'var(--bobr-ease-spring)',
        transitionDelay: reduced ? '0s' : `${delay}s`,
        // Held for the animation, released once it has actually finished —
        // setting it against `shown` would drop the hint the moment the
        // transition starts, which is when it is needed most.
        willChange: reduced || settled ? 'auto' : 'opacity, transform',
      }}
    >
      {children}
    </div>
  );
}
