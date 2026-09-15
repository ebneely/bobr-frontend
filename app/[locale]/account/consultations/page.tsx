import { setRequestLocale } from 'next-intl/server';

import { requireAccount } from '@/lib/api/server-session';
import { ConsultationsClient } from './ConsultationsClient';

export default async function AccountConsultationsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireAccount(locale, '/account/consultations');

  return <ConsultationsClient />;
}
