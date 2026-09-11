'use client';

import type { ComponentProps, ReactNode } from 'react';
import { Link } from '@/lib/i18n/navigation';

type Variant = 'solid' | 'outline' | 'light';

interface ButtonProps {
  children: ReactNode;
  href?: ComponentProps<typeof Link>['href'];
  variant?: Variant;
  type?: 'button' | 'submit';
  onClick?: () => void;
  className?: string;
}

/**
 * The primary call to action.
 *
 * The distinctive part is the offset block sitting behind the face: a second
 * layer nudged down-right in the accent colour, so the button reads as printed
 * rather than as a flat rectangle. On hover the face slides INTO that offset
 * and the block retreats, which makes the whole control feel pressed without
 * moving its hit area.
 *
 * The offset layer is aria-hidden and pointer-events:none — it is paint, and it
 * must never eat a click meant for the control.
 */
export function Button({
  children,
  href,
  variant = 'solid',
  type = 'button',
  onClick,
  className,
}: ButtonProps) {
  // Every face is OPAQUE. The offset block sits directly behind it, so a
  // transparent face lets that block show through and the label then sits dark
  // on dark — which is exactly what the outline variant did before this.
  const palette: Record<Variant, { bg: string; fg: string; offset: string }> = {
    solid: { bg: 'var(--bobr-fg)', fg: 'var(--bobr-on-dark)', offset: 'var(--bobr-accent)' },
    light: { bg: 'var(--bobr-bg)', fg: 'var(--bobr-fg)', offset: 'var(--bobr-accent)' },
    outline: { bg: 'var(--bobr-bg)', fg: 'var(--bobr-fg)', offset: 'var(--bobr-accent)' },
  };
  const c = palette[variant];

  const face = (
    <span
      className="bobr-btn-face"
      style={{
        position: 'relative',
        zIndex: 1,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px 36px',
        background: c.bg,
        color: c.fg,
        border: variant === 'outline' ? '1px solid var(--bobr-fg)' : 'none',
        borderRadius: 'var(--bobr-radius-control)',
        fontSize: 'var(--bobr-text-body)',
        fontWeight: 'var(--bobr-weight-semibold)',
        lineHeight: 1.2,
        transition: 'transform var(--bobr-duration) var(--bobr-ease), background var(--bobr-duration) var(--bobr-ease)',
      }}
    >
      {children}
    </span>
  );

  const offset = (
    <span
      aria-hidden
      className="bobr-btn-offset"
      style={{
        position: 'absolute',
        inset: 0,
        transform: 'translate3d(6px, 6px, 0)',
        background: c.offset,
        borderRadius: 'var(--bobr-radius-control)',
        pointerEvents: 'none',
        transition: 'transform var(--bobr-duration) var(--bobr-ease)',
      }}
    />
  );

  const shell: React.CSSProperties = {
    position: 'relative',
    display: 'inline-block',
    textDecoration: 'none',
    background: 'none',
    border: 0,
    padding: 0,
    cursor: 'pointer',
    font: 'inherit',
  };

  const inner = (
    <>
      {offset}
      {face}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={`bobr-btn ${className ?? ''}`} style={shell}>
        {inner}
      </Link>
    );
  }

  return (
    <button type={type} onClick={onClick} className={`bobr-btn ${className ?? ''}`} style={shell}>
      {inner}
    </button>
  );
}
