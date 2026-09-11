/**
 * Image assets the hero and section artwork point at.
 *
 * A null value means "no owned photograph yet" — every consumer falls back to
 * PlaceholderMedia, so the site builds and reads as finished with a slot empty,
 * and each one can be filled independently.
 *
 * To fill a slot: drop the file in `public/`, then set the path here. Leading
 * slash, no `public` prefix — `/hero-plate.png` is `public/hero-plate.png`.
 *
 * The hero motion is built around a TOP-DOWN CUTOUT on a transparent
 * background: it rotates slowly and drifts on scroll, so a rectangular photo
 * with a visible background will show its corners sweeping. Square, 900px+.
 *
 * NOTE ON LICENSING: the current hero plate came from the reference template's
 * CDN. Confirm the usage rights before this goes near production — replacing it
 * is a one-line change here plus the file.
 */
export const HERO_PLATE_SRC: string | null = '/hero-plate.png';

/** Intrinsic size, used to reserve space so the image cannot cause layout shift. */
export const HERO_PLATE_WIDTH = 912;
export const HERO_PLATE_HEIGHT = 922;
