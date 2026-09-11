'use client';

import { Children, type ReactNode } from 'react';

interface MarqueeProps {
  children: ReactNode;
  /** Seconds for one full cycle. Larger = slower. */
  duration?: number;
  reverse?: boolean;
  /** Gap between items, any CSS length. */
  gap?: string;
  className?: string;
}

/**
 * One copy of the item list. Declared at module scope rather than inside
 * Marquee: a component defined during render is a new type on every render, so
 * React unmounts and remounts the whole subtree instead of updating it — which
 * would restart the CSS animation on every parent render.
 */
function Track({
  items,
  gap,
  duplicate,
}: {
  items: ReactNode[];
  gap: string;
  duplicate?: boolean;
}) {
  return (
    <div
      // The second copy exists only to close the loop visually. A screen reader
      // should hear the list once.
      aria-hidden={duplicate || undefined}
      style={{ display: 'flex', gap, paddingInlineEnd: gap, flexShrink: 0 }}
    >
      {items.map((child, i) => (
        <div key={i} style={{ flexShrink: 0 }}>
          {child}
        </div>
      ))}
    </div>
  );
}

/**
 * Seamless infinite horizontal ticker.
 *
 * The track holds the children TWICE and translates -50%. When the first copy
 * has fully exited, the second is pixel-for-pixel where the first began, so the
 * loop closes with no seam — and because -50% is relative to the track's own
 * width, it needs no measurement and survives a resize or a font swap with no
 * JavaScript at all.
 *
 * The animation is pure CSS (`bobr-marquee` in globals.css), so it runs on the
 * compositor and keeps going while the main thread is busy. It pauses on hover
 * so a visitor can read the card they are pointing at, and it does not run at
 * all under prefers-reduced-motion.
 */
export function Marquee({
  children,
  duration = 40,
  reverse = false,
  gap = '1.5rem',
  className,
}: MarqueeProps) {
  const items = Children.toArray(children);

  return (
    <div
      className={`bobr-marquee-viewport ${className ?? ''}`}
      style={{ overflow: 'hidden', width: '100%' }}
    >
      <div
        className="bobr-marquee"
        data-play="true"
        data-reverse={reverse ? 'true' : undefined}
        style={{ ['--bobr-marquee-duration' as string]: `${duration}s` }}
      >
        <Track items={items} gap={gap} />
        <Track items={items} gap={gap} duplicate />
      </div>
    </div>
  );
}
