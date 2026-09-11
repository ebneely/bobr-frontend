/**
 * Image assets the hero and section artwork point at.
 *
 * These are null until BOBR has photography it owns. Every consumer falls back
 * to PlaceholderMedia when the value is null, so the site builds and looks
 * finished with no images present and each slot can be filled one at a time.
 *
 * To fill a slot: drop the file in `public/`, then set the path here. A leading
 * slash, no `public` prefix — `/hero-plate.png` resolves to `public/hero-plate.png`.
 *
 * The hero motion is built for a TOP-DOWN CUTOUT on a transparent background
 * (a plate shot from directly above, background removed). It rotates slowly and
 * drifts on scroll, so a rectangular photo with a visible background will show
 * its corners sweeping and look wrong. Square, ideally 900px+, PNG or WebP.
 */
export const HERO_PLATE_SRC: string | null = null;

/** Intrinsic size of the hero plate image, used to reserve space and avoid CLS. */
export const HERO_PLATE_SIZE = 920;
