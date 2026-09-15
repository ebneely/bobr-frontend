import { getTranslations, setRequestLocale } from 'next-intl/server';

import { SiteHeader } from '@/components/sections/SiteHeader';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { getServerSession } from '@/lib/api/server-session';
import { safeNextPath } from '@/lib/auth/next-path';
import { IntakeClient } from './IntakeClient';

/**
 * The pre-purchase intake profile.
 *
 * Not inside the (auth) group: a signed-out visitor gets a card that explains
 * why an account is needed and a login that returns here (G06), rather than a
 * bare redirect. The identity still comes from the session cookie on every API
 * call, so the card is courtesy and the API is the rule.
 *
 * `?next=` is where to continue once the profile is complete — the order page
 * sends people here with itself as `next` (G05).
 */
export default async function IntakePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const raw = (await searchParams).next;
  const next = safeNextPath(Array.isArray(raw) ? raw[0] : raw);
  const here = next ? `/${locale}/intake?next=${encodeURIComponent(next)}` : `/${locale}/intake`;
  const session = await getServerSession();

  const t = await getTranslations('intake');

  return (
    <>
      <SiteHeader />
      <main
        className="bobr-shell"
        style={{
          paddingBlock: 'var(--bobr-section-y)',
          display: 'flex',
          flexDirection: 'column',
          gap: '2.5rem',
          maxWidth: '52rem',
        }}
      >
        <SectionHeading
          eyebrow={t('eyebrow')}
          lead={t('lead')}
          em={t('em')}
          body={t('subtitle')}
          as="h1"
        />
        <IntakeClient
          signedIn={session.state !== 'signedOut'}
          next={next}
          returnPath={here}
        />
      </main>
    </>
  );
}
