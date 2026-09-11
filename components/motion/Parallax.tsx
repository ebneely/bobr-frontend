'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { useReducedMotion } from '@/lib/motion/use-reduced-motion';

interface ParallaxProps {
  children: ReactNode;
  /**
   * Total travel in pixels across the element's full pass through the viewport.
   * Positive drifts down (slower than scroll), negative drifts up (faster).
   */
  distance?: number;
  className?: string;
}

/**
 * Scroll-linked parallax drift.
 *
 * Driven from a rAF loop rather than a scroll event, and reading via
 * getBoundingClientRect once per frame: a scroll listener fires far more often
 * than the compositor paints, so the extra reads are wasted layout work. The
 * loop is only armed while the element is on screen — an IntersectionObserver
 * gates it, so a page with several of these costs nothing for the ones that are
 * nowhere near the viewport.
 *
 * Only `transform` is animated. Animating `top` or `background-position` here
 * would force layout or paint every frame instead of staying on the compositor.
 */
export function Parallax({ children, distance = -120, className }: ParallaxProps) {
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

      // 0 when the element's top edge is at the bottom of the viewport,
      // 1 when its bottom edge reaches the top — i.e. its full pass.
      const total = viewport + rect.height;
      const progress = (viewport - rect.top) / total;
      const clamped = Math.max(0, Math.min(1, progress));

      // Centre the travel on the midpoint so the element sits at its natural
      // position when it is centred in the viewport, rather than always
      // starting offset.
      const offset = (clamped - 0.5) * distance;
      el.style.transform = `translate3d(0, ${offset.toFixed(2)}px, 0)`;

      if (active) frame = requestAnimationFrame(update);
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !active) {
          active = true;
          frame = requestAnimationFrame(update);
          el.style.willChange = 'transform';
        } else if (!entry.isIntersecting && active) {
          active = false;
          cancelAnimationFrame(frame);
          el.style.willChange = 'auto';
        }
      },
      { rootMargin: '100px 0px' },
    );

    observer.observe(el);

    return () => {
      active = false;
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [distance, reduced]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
