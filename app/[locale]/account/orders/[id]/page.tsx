import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';

import { requireAccount } from '@/lib/api/server-session';
import { OrderDetailClient } from './OrderDetailClient';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function AccountOrderPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  // Checked before the gate so a malformed id cannot be smuggled into `next`.
  if (!UUID.test(id)) notFound();
  await requireAccount(locale, `/account/orders/${id}`);

  return <OrderDetailClient id={id} />;
}
