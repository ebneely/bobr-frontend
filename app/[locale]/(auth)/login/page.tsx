import { getTranslations, setRequestLocale } from 'next-intl/server';

import { SectionHeading } from '@/components/ui/SectionHeading';
import { LoginClient } from './LoginClient';

export default async function LoginPage({
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
        eyebrow={t('loginTitle')}
        lead={t('loginLead')}
        em={t('loginEm')}
        body={t('loginSubtitle')}
        as="h1"
      />
      <LoginClient />
    </div>
  );
}
