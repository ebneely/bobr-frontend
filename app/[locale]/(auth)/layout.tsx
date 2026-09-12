import type { ReactNode } from 'react';
import { setRequestLocale } from 'next-intl/server';

import { SiteHeader } from '@/components/sections/SiteHeader';

/**
 * Shell shared by login and register.
 *
 * A route group `(auth)` rather than a path segment, so these live at
 * `/pl/login` and not `/pl/auth/login` — the storefront's CTAs already point at
 * `/login`, and the URL a customer sees should not carry our folder structure.
 */
export default async function AuthLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <SiteHeader />
      <main
        style={{
          minHeight: 'calc(100dvh - var(--bobr-header-h))',
          display: 'grid',
          placeItems: 'center',
          paddingBlock: 'clamp(2rem, 6vw, 4rem)',
        }}
      >
        <div
          className="bobr-shell"
          style={{ width: '100%', maxWidth: '30rem' }}
        >
          {children}
        </div>
      </main>
    </>
  );
}
