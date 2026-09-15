import { setRequestLocale } from 'next-intl/server';

import { requireAccount } from '@/lib/api/server-session';
import { AccountOverviewClient } from './AccountOverviewClient';

/** /account — the status of everything, at a glance. */
export default async function AccountPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireAccount(locale, '/account');

  return <AccountOverviewClient />;
}
