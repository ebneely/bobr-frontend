import { setRequestLocale } from 'next-intl/server';

import { requireAccount } from '@/lib/api/server-session';
import { OrdersClient } from './OrdersClient';

export default async function AccountOrdersPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireAccount(locale, '/account/orders');

  return <OrdersClient />;
}
