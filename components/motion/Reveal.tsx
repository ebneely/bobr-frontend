'use client';

import {
  useEffect,
  useRef,
  useState,
  type ElementType,
  type ReactNode,
} from 'react';
import { useReducedMotion } from '@/lib/motion/use-reduced-motion';

type RevealDistance = 'sm' | 'lg';

interface RevealProps {
  children: ReactNode;
  /** Travel distance. `sm` (30px) for cards and list items, `lg` (60px) for whole blocks. */
  distance?: RevealDistance;
  /** Also scale up very slightly on the way in. For card-shaped things. */
  scale?: boolean;
  /**
   * Stagger index. Multiplied by --bobr-stagger (0.1s), so siblings pass 0, 1,
   * 2 rather than each computing its own seconds.
   */
  index?: number;
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
  scale = false,
  index = 0,
  className,
  as: Tag = 'div',
}: RevealProps) {
  const ref = useRef<HTMLElement | null>(null);
  const [entered, setEntered] = useState(false);
  // Tracks the transition itself, so will-change can be dropped once the work
  // is actually finished rather than when it begins.
  const [settled, setSettled] = useState(false);
  const reduced = useReducedMotion();

  // Derived, not stored. With motion off the content is visible from the very
  // first render — setting that in an effect would render it hidden once, and a
  // reveal that never fires is missing content rather than calm content.
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

  const hiddenTransform = scale
    ? `translate3d(0, ${travel}, 0) scale(var(--bobr-reveal-scale))`
    : `translate3d(0, ${travel}, 0)`;

  /**
   * will-change is a promise to the compositor that costs a layer to keep.
   *
   * It has to be set BEFORE the transition runs and dropped AFTER it ends. The
   * obvious `shown ? 'auto' : '...'` is backwards: it removes the hint at the
   * exact moment the animation starts, so the promotion never covers the work
   * it was for. Holding it forever is the other failure — a layer per element
   * for the life of the page is how a smooth site turns janky at scale.
   */
  const willChange = reduced || settled ? 'auto' : 'opacity, transform';

  return (
    <Tag
      ref={ref}
      className={className}
      onTransitionEnd={() => setSettled(true)}
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? 'translate3d(0, 0, 0) scale(1)' : hiddenTransform,
        transitionProperty: 'opacity, transform',
        transitionDuration: 'var(--bobr-duration-slow)',
        transitionTimingFunction: 'var(--bobr-ease-reveal)',
        transitionDelay: `calc(var(--bobr-stagger) * ${index})`,
        willChange,
      }}
    >
      {children}
    </Tag>
  );
}
