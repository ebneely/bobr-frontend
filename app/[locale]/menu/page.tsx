import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { SiteHeader } from '@/components/sections/SiteHeader';
import { SiteFooter } from '@/components/sections/SiteFooter';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { parseMenuFilters } from '@/lib/menu';
import { MenuClient } from './MenuClient';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'menu' });
  return { title: t('metaTitle'), description: t('metaDescription') };
}

/**
 * The public menu — no account needed, like the home page.
 *
 * The URL's `?q=&diet=&without=` is parsed here, on the server, with the same
 * function the client writes it back with, so a shared link opens with its
 * search already in the field and its chips already pressed on the very first
 * paint rather than a moment after hydration.
 */
export default async function MenuPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('menu');
  const initialFilters = parseMenuFilters(await searchParams);

  return (
    <>
      <SiteHeader />
      <main className="bobr-menu-page">
        <div className="bobr-shell bobr-menu-hero">
          <SectionHeading
            eyebrow={t('eyebrow')}
            lead={t('lead')}
            em={t('em')}
            body={t('subtitle')}
            as="h1"
          />
        </div>
        <div className="bobr-shell">
          <MenuClient initialFilters={initialFilters} />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
