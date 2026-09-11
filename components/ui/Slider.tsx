'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

interface SliderProps {
  children: ReactNode;
  /** Accessible name for the scrollable region. */
  label: string;
  /** Width of each slide, any CSS length. */
  slideWidth?: string;
  gap?: string;
  className?: string;
}

/**
 * Horizontal slider with prev/next controls.
 *
 * Built on CSS scroll-snap rather than a JS spring that translates a track.
 *
 * The measured reference animates a transform with spring physics, and that
 * looks right but gives up things worth more than the physics: native touch
 * momentum and rubber-banding, keyboard scrolling, screen-reader access to
 * off-screen slides, and find-in-page. Scroll-snap keeps all of it, and the
 * browser's own snap animation is already a decelerating curve.
 *
 * `data-lenis-prevent` keeps Lenis off this element — Lenis hijacks wheel
 * events globally, and without it a horizontal trackpad gesture over the
 * slider scrolls the page instead of the track.
 */
export function Slider({
  children,
  label,
  slideWidth = 'min(var(--bobr-ticker-item), 82vw)',
  gap = 'var(--bobr-ticker-gap)',
  className,
}: SliderProps) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const sync = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    // 1px of slack: sub-pixel scroll positions mean an exact comparison leaves
    // the end button enabled at the end, or disabled a pixel before it.
    setAtStart(el.scrollLeft <= 1);
    setAtEnd(el.scrollLeft >= max - 1);
  }, []);

  useEffect(() => {
    sync();
    const el = trackRef.current;
    if (!el) return;

    el.addEventListener('scroll', sync, { passive: true });
    // Slide count and container width both change on resize, so the end
    // position does too.
    const observer = new ResizeObserver(sync);
    observer.observe(el);

    return () => {
      el.removeEventListener('scroll', sync);
      observer.disconnect();
    };
  }, [sync]);

  const page = (direction: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    // Scroll by one viewport of the track rather than a hardcoded slide width,
    // so it stays correct however many slides happen to be visible.
    el.scrollBy({ left: el.clientWidth * direction, behavior: 'smooth' });
  };

  return (
    <div className={className}>
      <div
        ref={trackRef}
        role="region"
        aria-label={label}
        tabIndex={0}
        className="bobr-slider-track"
        data-lenis-prevent
        style={{
          display: 'flex',
          gap,
          overflowX: 'auto',
          scrollSnapType: 'x mandatory',
          scrollbarWidth: 'none',
          scrollPaddingInline: 'var(--bobr-gutter)',
          paddingInline: 'var(--bobr-gutter)',
          paddingBlock: '0.5rem',
        }}
      >
        {Array.isArray(children)
          ? children.map((child, i) => (
              <div
                key={i}
                style={{
                  flex: `0 0 ${slideWidth}`,
                  scrollSnapAlign: 'start',
                }}
              >
                {child}
              </div>
            ))
          : children}
      </div>

      <div
        style={{
          display: 'flex',
          gap: '0.75rem',
          justifyContent: 'center',
          marginTop: '1.5rem',
        }}
      >
        <button
          type="button"
          className="bobr-slider-btn"
          onClick={() => page(-1)}
          disabled={atStart}
          aria-label={`${label}: previous`}
        >
          <Chevron direction="left" />
        </button>
        <button
          type="button"
          className="bobr-slider-btn"
          onClick={() => page(1)}
          disabled={atEnd}
          aria-label={`${label}: next`}
        >
          <Chevron direction="right" />
        </button>
      </div>
    </div>
  );
}

function Chevron({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
      style={{ transform: direction === 'left' ? 'rotate(180deg)' : undefined }}
    >
      <path
        d="M6 3l5 5-5 5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
