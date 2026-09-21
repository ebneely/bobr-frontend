import type { ImageLoaderProps } from 'next/image';

/**
 * The widths the backend already rendered for one photo — `imageSrcSet` on a
 * meal or menu item. Keys are the delivered pixel width (`"320"`, `"480"`, …),
 * values are signed imgproxy URLs. Null when storage cannot resize (local-disk
 * dev, presigned S3): then there is only `imageUrl`.
 */
export type ImageSrcSet = Record<string, string>;

/** The rung widths of a srcset, ascending; non-numeric keys are ignored. */
export function srcSetRungs(srcSet: ImageSrcSet | null | undefined): number[] {
  if (!srcSet) return [];
  return Object.keys(srcSet)
    .map(Number)
    .filter((n) => Number.isFinite(n) && n > 0)
    .sort((a, b) => a - b);
}

/**
 * A `next/image` loader that picks from widths the SERVER already rendered.
 * Ported from minirue-frontend's `lib/images/hero-loader.ts`.
 *
 * With a custom loader Next proxies nothing: `/_next/image` is never involved,
 * so `images.remotePatterns` does not apply and the imgproxy host (a deploy
 * variable in neither repository) cannot break every photo at once. Next only
 * asks this function for a URL per candidate width and builds the `srcset`.
 *
 * The widths cannot be computed here — an imgproxy URL is signed, so only the
 * backend can produce one — which is why the server sends a map, not a pattern.
 *
 * Nearest rung at or ABOVE the requested width, never below: downscaling a
 * slightly larger render is invisible, upscaling a smaller one is the blur this
 * exists to remove. Past the top rung it returns the largest there is. With no
 * usable rungs it returns `src` (the single `imageUrl`).
 */
export function srcSetLoader(srcSet: ImageSrcSet | null | undefined) {
  const rungs = srcSetRungs(srcSet);
  return ({ src, width }: ImageLoaderProps): string => {
    if (!srcSet || rungs.length === 0) return src;
    const chosen = rungs.find((rung) => rung >= width) ?? rungs[rungs.length - 1];
    return srcSet[String(chosen)] ?? src;
  };
}
