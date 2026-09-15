import { setRequestLocale } from 'next-intl/server';

import { requireAccount } from '@/lib/api/server-session';
import { ProfileClient } from './ProfileClient';

export default async function AccountProfilePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireAccount(locale, '/account/profile');
  const user = session.state === 'signedIn' ? session.user : null;

  return <ProfileClient serverName={user?.name ?? null} serverEmail={user?.email ?? null} />;
}
