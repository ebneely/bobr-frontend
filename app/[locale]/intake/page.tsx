import { getTranslations, setRequestLocale } from 'next-intl/server';

import { SiteHeader } from '@/components/sections/SiteHeader';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { IntakeClient } from './IntakeClient';

/**
 * The pre-purchase intake profile.
 *
 * Deliberately NOT inside the (auth) group. The identity comes from the session
 * cookie on every API call, so the screen renders for anyone and the refusal
 * arrives from the server — a route guard here would only be advice, and it
 * would also break prerendering of a page that is otherwise fully static.
 */
export default async function IntakePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('intake');

  return (
    <>
      <SiteHeader />
      <main
        className="bobr-shell"
        style={{
          paddingBlock: 'var(--bobr-section-y)',
          display: 'flex',
          flexDirection: 'column',
          gap: '2.5rem',
          maxWidth: '52rem',
        }}
      >
        <SectionHeading
          eyebrow={t('eyebrow')}
          lead={t('lead')}
          em={t('em')}
          body={t('subtitle')}
          as="h1"
        />
        <IntakeClient />
      </main>
    </>
  );
}
