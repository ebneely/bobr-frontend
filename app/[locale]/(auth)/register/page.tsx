import { getTranslations, setRequestLocale } from 'next-intl/server';

import { SectionHeading } from '@/components/ui/SectionHeading';
import { safeNextPath } from '@/lib/auth/next-path';
import { RegisterClient } from './RegisterClient';

export default async function RegisterPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const { locale } = await params;
  // Read on the server and validated here, so the client only ever receives a
  // path that is already known to be local.
  const raw = (await searchParams).next;
  const next = safeNextPath(Array.isArray(raw) ? raw[0] : raw);
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
      <RegisterClient next={next} />
    </div>
  );
}
