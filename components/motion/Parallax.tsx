'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { useReducedMotion } from '@/lib/motion/use-reduced-motion';

interface ParallaxProps {
  children: ReactNode;
  /**
   * Drift as a fraction of viewport height. 0.15 gives roughly +-60px of travel
   * on a 800px viewport, which is the measured strength on the reference.
   *
   * A ratio rather than a pixel count so the effect holds its proportions: a
   * fixed 60px is a strong drift on a phone and an invisible one on a 27in
   * display.
   */
  ratio?: number;
  /** Explicit total travel in px, overriding `ratio` when a block needs its own. */
  distance?: number;
  /** Negative drifts up (faster than scroll), positive drifts down. */
  direction?: 1 | -1;
  className?: string;
}

/**
 * Scroll-linked parallax drift.
 *
 * Driven from a rAF loop reading getBoundingClientRect once per frame, rather
 * than from a scroll event: scroll fires far more often than the compositor
 * paints, so the extra reads are wasted layout work. The loop is armed only
 * while the element is on screen — an IntersectionObserver gates it, so the
 * ones nowhere near the viewport cost nothing.
 *
 * Only `transform` is animated. Animating `top` or `background-position` would
 * force layout or paint every frame instead of staying on the compositor.
 *
 * The PARENT must clip: this element travels past its natural box, and without
 * `overflow: hidden` on the container that travel shows as a gap at one edge.
 */
export function Parallax({
  children,
  ratio = 0.15,
  distance,
  direction = -1,
  className,
}: ParallaxProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) return;

    const el = ref.current;
    if (!el) return;

    let frame = 0;
    let active = false;

    const update = () => {
      const rect = el.getBoundingClientRect();
      const viewport = window.innerHeight;
      const travel = distance ?? viewport * ratio;

      // 0 when the element's top edge sits at the bottom of the viewport,
      // 1 when its bottom edge reaches the top — its full pass.
      const total = viewport + rect.height;
      const progress = (viewport - rect.top) / total;
      const clamped = Math.max(0, Math.min(1, progress));

      // Centred on the midpoint so the element sits at its NATURAL position
      // when centred in the viewport, drifting symmetrically either side of
      // that. Anchoring at 0 instead would leave it permanently offset.
      const offset = (clamped - 0.5) * travel * direction;
      el.style.transform = `translate3d(0, ${offset.toFixed(2)}px, 0)`;

      if (active) frame = requestAnimationFrame(update);
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !active) {
          active = true;
          // Promote for the duration of the drift, and only that. A layer held
          // for the life of the page is how a smooth site turns janky at scale.
          el.style.willChange = 'transform';
          frame = requestAnimationFrame(update);
        } else if (!entry.isIntersecting && active) {
          active = false;
          cancelAnimationFrame(frame);
          el.style.willChange = 'auto';
        }
      },
      // Arm slightly early so the first painted frame is already at the right
      // offset, rather than snapping once the element crosses the edge.
      { rootMargin: '100px 0px' },
    );

    observer.observe(el);

    return () => {
      active = false;
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [ratio, distance, direction, reduced]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
