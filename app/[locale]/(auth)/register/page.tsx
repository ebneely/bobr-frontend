import { getTranslations, setRequestLocale } from 'next-intl/server';

import { SectionHeading } from '@/components/ui/SectionHeading';
import { RegisterClient } from './RegisterClient';

export default async function RegisterPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('auth');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <SectionHeading
        eyebrow={t('registerTitle')}
        lead={t('registerLead')}
        em={t('registerEm')}
        body={t('registerSubtitle')}
        as="h1"
      />
      <RegisterClient />
    </div>
  );
}
