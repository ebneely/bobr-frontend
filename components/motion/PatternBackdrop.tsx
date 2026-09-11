'use client';

import { Parallax } from './Parallax';

/**
 * A tiled pattern that drifts behind a section as it scrolls.
 *
 * The motif is an inline data-URI SVG rather than a file: it is a few hundred
 * bytes, so inlining it costs no request and the texture can never pop in a
 * beat after the section it belongs to.
 *
 * Drifts at roughly two thirds the strength of a foreground parallax, so the
 * layers separate without the backdrop competing with the content on top.
 *
 * The vertical overhang is load-bearing: the layer travels, and without extra
 * height that travel shows as a bare strip at whichever edge it moves away
 * from. It is applied as height + negative margin rather than as `inset`,
 * because Parallax transforms its own wrapper — and a transformed element
 * becomes the containing block for absolutely-positioned descendants, so an
 * inset layer inside it would resolve against the wrapper instead of the
 * section. The buffer must exceed half the total travel.
 */
export function PatternBackdrop({
  ratio = 0.1,
  opacity = 0.5,
  buffer = 60,
}: {
  ratio?: number;
  opacity?: number;
  /** Vertical overhang in px. Must exceed half the travel or an edge goes bare. */
  buffer?: number;
}) {
  // A sparse dot-and-leaf lattice in the brand green. It only has to read as
  // texture at low opacity, so it stays to four strokes.
  const motif = `<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 72 72">
    <g fill="none" stroke="rgb(51,82,48)" stroke-width="1" opacity="0.28">
      <circle cx="18" cy="18" r="2.5"/>
      <circle cx="54" cy="54" r="2.5"/>
      <path d="M54 10c-7 0-12 5-12 12 7 0 12-5 12-12Z"/>
      <path d="M18 50c7 0 12 5 12 12-7 0-12-5-12-12Z"/>
    </g>
  </svg>`;

  const url = `url("data:image/svg+xml,${encodeURIComponent(motif)}")`;

  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        // Clips the overhang, so the drift never spills into the next section.
        overflow: 'hidden',
      }}
    >
      <Parallax ratio={ratio} direction={1} className="bobr-backdrop-layer">
        <div
          style={{
            height: `calc(100% + ${buffer * 2}px)`,
            marginTop: -buffer,
            backgroundImage: url,
            backgroundRepeat: 'repeat',
            opacity,
          }}
        />
      </Parallax>
    </div>
  );
}
