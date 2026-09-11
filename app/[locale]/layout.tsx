import type { Metadata } from 'next';
import { Jost } from 'next/font/google';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';

import { routing } from '@/lib/i18n/routing';
import { QueryProvider } from '@/lib/hooks/query-provider';
import { SmoothScroll } from '@/components/motion/SmoothScroll';

/**
 * One family, loaded through next/font so the file is self-hosted and the
 * @font-face lands in the initial CSS — no request to a third party, and no
 * layout shift waiting for it. `display: swap` shows fallback text immediately
 * rather than holding the first paint hostage to a font file.
 */
const jost = Jost({
  subsets: ['latin', 'latin-ext'], // latin-ext carries the Polish diacritics
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-jost',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'BOBR',
  description:
    'Catering dietetyczny z dostawą — keto, bezglutenowa, dla alergików.',
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  // Required for static rendering — without it every page under this layout
  // silently opts into dynamic rendering.
  setRequestLocale(locale);

  return (
    <html lang={locale} className={jost.variable}>
      <body>
        <NextIntlClientProvider>
          <QueryProvider>
            {/* Mounted once, here. Lenis cancels the browser's own scroll and
                re-drives it from a rAF loop, so it owns the scroll position for
                the whole document — two instances would fight each other. */}
            <SmoothScroll>{children}</SmoothScroll>
          </QueryProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
