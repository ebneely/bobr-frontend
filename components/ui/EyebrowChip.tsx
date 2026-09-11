import type { ReactNode } from 'react';

/**
 * The small labelled frame that sits above a section heading.
 *
 * A thin accent rule with a filled dot pinned at each of the four corners —
 * the dots are what stop it reading as a plain bordered box. Built from one
 * element plus four absolutely-positioned spans rather than an image, so it
 * scales, recolours from tokens, and costs no request.
 *
 * Decorative: the text is the label, the frame carries no meaning of its own.
 */
export function EyebrowChip({ children }: { children: ReactNode }) {
  const dot = {
    position: 'absolute' as const,
    width: 9,
    height: 9,
    borderRadius: '50%',
    background: 'var(--bobr-fg)',
  };

  return (
    <span
      style={{
        position: 'relative',
        display: 'inline-block',
        padding: '12px 28px',
        border: '1px solid var(--bobr-border-accent)',
        color: 'var(--bobr-fg)',
        fontSize: 'var(--bobr-text-body)',
        lineHeight: 1.2,
        textTransform: 'capitalize',
      }}
    >
      <span aria-hidden style={{ ...dot, top: -5, left: -5 }} />
      <span aria-hidden style={{ ...dot, top: -5, right: -5 }} />
      <span aria-hidden style={{ ...dot, bottom: -5, left: -5 }} />
      <span aria-hidden style={{ ...dot, bottom: -5, right: -5 }} />
      {children}
    </span>
  );
}
