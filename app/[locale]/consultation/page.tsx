import { getTranslations, setRequestLocale } from 'next-intl/server';

import { SiteHeader } from '@/components/sections/SiteHeader';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { ConsultationClient } from './ConsultationClient';

/**
 * Booking a consultation with a doctor.
 *
 * Like /order and /intake, not inside a route guard: the page renders for
 * anyone, the client shows a log-in prompt when there is no session, and the
 * API refuses an anonymous booking regardless — the rule lives in the write
 * path, where it cannot be skipped.
 */
export default async function ConsultationPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('consultation');

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
        <ConsultationClient />
      </main>
    </>
  );
}
