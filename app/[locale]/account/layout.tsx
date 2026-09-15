import { getTranslations, setRequestLocale } from 'next-intl/server';

import { SiteHeader } from '@/components/sections/SiteHeader';
import { getServerSession } from '@/lib/api/server-session';
import { AccountTabs } from './_components/AccountTabs';
import './account.css';

/**
 * The customer account shell: greeting, tabs, then the tab.
 *
 * The route gate is NOT here: a layout does not know which page it wraps, and
 * the login redirect has to carry that page as `next`. Each page calls
 * `requireAccount(locale, path)`; this layout only reads the same (cached)
 * session to greet the customer by name.
 */
export default async function AccountLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('account');
  const session = await getServerSession();
  const name = session.state === 'signedIn' ? session.user.name?.trim() : null;
  const firstName = name ? name.split(/\s+/)[0] : null;

  return (
    <>
      <SiteHeader />
      <main className="bobr-shell bobr-account">
        <header className="bobr-account__head">
          <p className="bobr-kicker">{t('kicker')}</p>
          <h1 className="bobr-account__title" data-testid="account-greeting">
            {firstName ? (
              <>
                {t('hello')} <span className="bobr-em">{firstName}</span>
              </>
            ) : (
              t('helloFallback')
            )}
          </h1>
          <p className="bobr-account__lede">{t('subtitle')}</p>
        </header>
        <AccountTabs />
        {children}
      </main>
    </>
  );
}
