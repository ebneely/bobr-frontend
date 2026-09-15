import type { ComponentProps, ReactNode } from 'react';

import { Button } from '@/components/ui/Button';
import type { Link } from '@/lib/i18n/navigation';

/**
 * "You need X before you can do this", with the one button that gets you X.
 *
 * Used where a page cannot do its job for this visitor yet — signed out on the
 * order or intake page (G06), intake missing on the order page — so the answer
 * is a way forward instead of a raw 401 or a "load failed".
 */
export function GateCard({
  title,
  body,
  cta,
  href,
  testId,
  children,
}: {
  title: string;
  body: string;
  cta: string;
  href: ComponentProps<typeof Link>['href'];
  testId?: string;
  children?: ReactNode;
}) {
  return (
    <section
      data-testid={testId}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        alignItems: 'flex-start',
        padding: 'clamp(1.5rem, 4vw, 2.25rem)',
        background: 'var(--bobr-surface)',
        border: '1px solid var(--bobr-border)',
        borderRadius: 'var(--bobr-radius)',
      }}
    >
      <h2 className="bobr-h4">{title}</h2>
      <p className="bobr-body" style={{ maxWidth: '52ch' }}>
        {body}
      </p>
      {children}
      <Button href={href}>{cta}</Button>
    </section>
  );
}
