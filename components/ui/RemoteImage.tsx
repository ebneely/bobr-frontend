'use client';

import React from 'react';
import Image from 'next/image';

import { srcSetLoader, srcSetRungs, type ImageSrcSet } from '@/lib/images/srcset-loader';

/**
 * A catalogue photo (meal, dish, printed menu) that downloads the width the
 * device needs, and degrades to a plain `<img>` rather than to a broken frame.
 * Ported from minirue-frontend's `components/ui/RemoteImage.tsx`, with one
 * deliberate difference: it NEVER goes through `/_next/image`.
 *
 * The backend already renders every photo at 320/480/640/828/1080 px as webp
 * (`imageSrcSet`, bobr-backend#55). With that map, `next/image` + the
 * {@link srcSetLoader} builds a real `srcset` straight onto imgproxy: no second
 * encode, no extra hop, and no `images.remotePatterns` to keep in step with a
 * deploy variable. A 390px DPR-3 phone with `sizes` ≈ 100vw asks for ~1170 px
 * and gets the 1080 rung; a desktop card of 360px at 1x gets the 480 rung.
 *
 * Without a map (`imageSrcSet` null: local-disk dev, presigned S3, an absolute
 * URL in the column) there is one file only, so this renders exactly the plain
 * `<img src={imageUrl}>` that shipped before.
 *
 * If the srcset request fails (imgproxy down, a bad signature) it swaps to the
 * plain `<img>` of `imageUrl`; if THAT fails too it renders `fallback` (the
 * caller's placeholder), or nothing.
 *
 * ## Layout
 *
 * The caller owns the box. Every call site sits in a frame with a fixed design
 * ratio (or sets `aspect-ratio` on the image via `style`) and crops with
 * `object-fit: cover`, so the space is reserved before a byte arrives and the
 * load causes no shift. `width`/`height` are the photo's real pixel size
 * (`imageWidth`/`imageHeight`), written onto the tag as intrinsic dimensions;
 * when the backend does not know them (photos uploaded before #55) they are
 * derived from `ratio`, the frame's own ratio, so the tag never lacks them.
 *
 * `sizes` is required: without it `next/image` assumes the full viewport and a
 * 250px card would pull the top rung. Derive it from the real box width at each
 * breakpoint and err high — an over-estimate wastes bytes, an under-estimate
 * ships a visibly soft photo.
 */
export interface RemoteImageProps {
  /** `imageUrl`: the single fallback render. */
  src: string;
  /** `imageSrcSet`: the server-rendered width ladder, or null. */
  srcSet?: ImageSrcSet | null;
  alt: string;
  sizes: string;
  /** `imageWidth` — the photo's intrinsic width, when the backend knows it. */
  width?: number | null;
  /** `imageHeight` — the photo's intrinsic height, when the backend knows it. */
  height?: number | null;
  /** The frame's ratio (`'4 / 3'`), used for the intrinsic size when width/height are unknown. */
  ratio?: string;
  className?: string;
  style?: React.CSSProperties;
  /** Shown only when both the srcset and the plain URL failed to load. */
  fallback?: React.ReactNode;
}

/** Width written onto the tag when the backend does not know the photo's size: the top rung. */
const FALLBACK_WIDTH = 1080;

/** `'4 / 3'` → 4/3; anything unparsable → 4/3, the most common frame here. */
export function parseRatio(ratio: string | undefined): number {
  const [w, h] = (ratio ?? '').split('/').map((part) => Number(part.trim()));
  return w > 0 && h > 0 ? w / h : 4 / 3;
}

/** The intrinsic size for the tag: the real one when known, else one derived from the frame ratio. */
export function intrinsicSize(
  width: number | null | undefined,
  height: number | null | undefined,
  ratio: string | undefined,
): { width: number; height: number } {
  if (width && height && width > 0 && height > 0) return { width, height };
  return { width: FALLBACK_WIDTH, height: Math.round(FALLBACK_WIDTH / parseRatio(ratio)) };
}

export function RemoteImage({
  src,
  srcSet,
  alt,
  sizes,
  width,
  height,
  ratio,
  className,
  style,
  fallback = null,
}: RemoteImageProps) {
  // 0: srcset via next/image, 1: plain <img> of `src`, 2: both failed. Keyed
  // by `src`, so a different photo gets a fresh try rather than the previous
  // one's verdict.
  const [failure, setFailure] = React.useState<{ src: string; stage: 1 | 2 } | null>(null);
  const stage = failure?.src === src ? failure.stage : 0;
  const setStage = (next: 1 | 2) => setFailure({ src, stage: next });

  const loader = React.useMemo(() => srcSetLoader(srcSet), [srcSet]);
  const hasLadder = srcSetRungs(srcSet).length > 0;
  const size = intrinsicSize(width, height, ratio);

  if (stage === 2) return <>{fallback}</>;

  if (!hasLadder || stage === 1) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        width={size.width}
        height={size.height}
        loading="lazy"
        decoding="async"
        className={className}
        style={style}
        onError={() => setStage(2)}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      loader={loader}
      sizes={sizes}
      width={size.width}
      height={size.height}
      className={className}
      style={style}
      onError={() => setStage(1)}
    />
  );
}
