import { setRequestLocale } from 'next-intl/server';

import { requireAccount } from '@/lib/api/server-session';
import { WeightClient } from './WeightClient';

export default async function AccountWeightPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireAccount(locale, '/account/weight');

  return <WeightClient />;
}
