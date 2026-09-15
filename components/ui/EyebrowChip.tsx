import type { ReactNode } from 'react';

/**
 * The small labelled frame that sits above a section heading.
 *
 * A thin accent rule with a filled dot pinned at each of the four corners —
 * the dots are what stop it reading as a plain bordered box. Built from one
 * element plus four absolutely-positioned spans rather than an image, so it
 * scales, recolours from tokens, and costs no request.
 *
 * Geometry lives in `.bobr-eyebrow` (globals.css) as custom properties, so the
 * hero can enlarge it to the reference's badge (`.bobr-eyebrow--hero`) without a
 * second component.
 *
 * The label renders exactly as written in the messages. It used to be
 * `text-transform: capitalize`, which turned Polish "Z tego tygodnia" into
 * "Z Tego Tygodnia" — Polish uses sentence case, and so does the English copy.
 *
 * Decorative: the text is the label, the frame carries no meaning of its own.
 */
export function EyebrowChip({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={className ? `bobr-eyebrow ${className}` : 'bobr-eyebrow'}>
      <span aria-hidden className="bobr-eyebrow__dot" data-corner="tl" />
      <span aria-hidden className="bobr-eyebrow__dot" data-corner="tr" />
      <span aria-hidden className="bobr-eyebrow__dot" data-corner="bl" />
      <span aria-hidden className="bobr-eyebrow__dot" data-corner="br" />
      {children}
    </span>
  );
}
