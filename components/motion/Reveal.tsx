'use client';

import { useEffect, useRef, useState, type ElementType, type ReactNode } from 'react';
import { useReducedMotion } from '@/lib/motion/use-reduced-motion';

type RevealDistance = 'sm' | 'lg';

interface RevealProps {
  children: ReactNode;
  /** Travel distance. `sm` (30px) for cards and list items, `lg` (60px) for whole blocks. */
  distance?: RevealDistance;
  /** Seconds to wait before starting — stagger a group by incrementing this. */
  delay?: number;
  className?: string;
  as?: ElementType;
}

/**
 * Fade-and-rise on first entry into the viewport.
 *
 * IntersectionObserver rather than a scroll handler: the browser computes
 * intersection off the main thread, so a page with fifty of these costs nothing
 * per frame, where fifty scroll listeners each calling getBoundingClientRect
 * would cost a layout apiece.
 *
 * Unobserves after firing. These are entrances, not scroll-linked states — an
 * element that re-hides when scrolled past and re-animates on the way back is a
 * distraction, and it makes returning to a section feel unstable.
 */
export function Reveal({
  children,
  distance = 'sm',
  delay = 0,
  className,
  as: Tag = 'div',
}: RevealProps) {
  const ref = useRef<HTMLElement | null>(null);
  const [entered, setEntered] = useState(false);
  const reduced = useReducedMotion();

  // Derived, not stored. With motion off the content is visible from the very
  // first render — setting that in an effect would render it hidden once, and
  // a reveal that never fires is missing content rather than calm content.
  const shown = entered || reduced;

  useEffect(() => {
    if (reduced) return;

    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          setEntered(true);
          observer.unobserve(entry.target);
        }
      },
      {
        // Fire slightly before the element's top edge arrives, so the motion is
        // finishing as it reaches a comfortable reading position rather than
        // only starting there.
        rootMargin: '0px 0px -12% 0px',
        threshold: 0.05,
      },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [reduced]);

  const travel =
    distance === 'lg' ? 'var(--bobr-reveal-lg)' : 'var(--bobr-reveal-sm)';

  return (
    <Tag
      ref={ref}
      className={className}
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? 'translate3d(0, 0, 0)' : `translate3d(0, ${travel}, 0)`,
        transition: `opacity var(--bobr-duration-slow) var(--bobr-ease-out) ${delay}s, transform var(--bobr-duration-slow) var(--bobr-ease-out) ${delay}s`,
        // Promote only while the animation can still run. Leaving will-change
        // on permanently keeps a compositor layer per element for the life of
        // the page, which is how a smooth site turns janky at scale.
        willChange: shown ? 'auto' : 'opacity, transform',
      }}
    >
      {children}
    </Tag>
  );
}
