import { setRequestLocale } from 'next-intl/server';

import { requireAccount } from '@/lib/api/server-session';
import { NotesClient } from './NotesClient';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function AccountNotesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ order?: string | string[] }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireAccount(locale, '/account/notes');

  // "Write about this order" links here with ?order=<id>. Only a well-formed id
  // preselects; the API still checks it belongs to this customer.
  const raw = (await searchParams).order;
  const orderId = typeof raw === 'string' && UUID.test(raw) ? raw : null;

  return <NotesClient initialOrderId={orderId} />;
}
