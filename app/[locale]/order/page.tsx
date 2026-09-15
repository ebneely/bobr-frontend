import { getTranslations, setRequestLocale } from 'next-intl/server';

import { SiteHeader } from '@/components/sections/SiteHeader';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { parseMealParam } from '@/lib/api/meals';
import { getServerIntakeState, getServerSession } from '@/lib/api/server-session';
import { redirect } from '@/lib/i18n/navigation';
import { OrderClient } from './OrderClient';

/**
 * The ordering flow.
 *
 * The page resolves where the visitor stands before showing the form (G05):
 * signed out → an explanatory card with a login that returns here; signed in
 * without a complete intake profile → the intake, which hands them back here.
 *
 * These are courtesy, not the rule. The API refuses a quote or an order for
 * the same reasons, and the client handles those refusals too — a session
 * that expires mid-order, or an API this server could not reach.
 */
export default async function OrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ meal?: string | string[] }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const mealId = parseMealParam((await searchParams).meal);
  const here = mealId ? `/${locale}/order?meal=${mealId}` : `/${locale}/order`;

  const session = await getServerSession();
  if (session.state === 'signedIn') {
    const intake = await getServerIntakeState();
    if (intake === 'missing' || intake === 'incomplete') {
      redirect({ href: { pathname: '/intake', query: { next: here } }, locale });
    }
  }

  const t = await getTranslations('order');

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
          as="h1"
        />
        <OrderClient
          // `unknown` (API unreachable from here) is not signed out: render the
          // form and let the API's answer decide.
          signedIn={session.state !== 'signedOut'}
          initialMealId={mealId}
          returnPath={here}
        />
      </main>
    </>
  );
}
