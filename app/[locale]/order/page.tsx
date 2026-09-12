import { getTranslations, setRequestLocale } from 'next-intl/server';

import { SiteHeader } from '@/components/sections/SiteHeader';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { OrderClient } from './OrderClient';

/**
 * The ordering flow.
 *
 * Not inside the (auth) group: the page renders for anyone, and the REFUSAL
 * comes from the API when an order is placed without a completed intake
 * profile. The gate belongs in the write path, where it cannot be skipped —
 * a UI that hides the button is advice, not a rule.
 */
export default async function OrderPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('order');

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
          as="h1"
        />
        <OrderClient />
      </main>
    </>
  );
}
