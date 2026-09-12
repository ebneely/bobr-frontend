'use client';

import { useTranslations } from 'next-intl';

import { authClient, signOut } from '@/lib/auth/client';
import { Link } from '@/lib/i18n/navigation';
import { DASHBOARD_URL } from '@/lib/auth/urls';

/**
 * The account corner of the header: a log-in link, or the dashboard and a way
 * out once there is a session.
 *
 * One component used by both the desktop bar and the mobile drawer, so the two
 * cannot drift into disagreeing about whether someone is signed in.
 *
 * While the session is still loading it renders NOTHING rather than guessing.
 * Showing "log in" first and swapping it a beat later is the worse failure: a
 * signed-in customer sees the site tell them they are signed out, which reads
 * as having been logged out.
 */
export function AccountNav({ tabIndex }: { tabIndex?: number }) {
  const t = useTranslations('nav');
  const tc = useTranslations('common');

  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    // Holds the space so the header does not reflow when this resolves.
    return <span aria-hidden style={{ minWidth: '4rem' }} />;
  }

  if (!session) {
    return (
      <Link
        href="/login"
        className="bobr-navlink"
        tabIndex={tabIndex}
        style={{ fontSize: 'var(--bobr-text-body)', whiteSpace: 'nowrap' }}
      >
        {tc('login')}
      </Link>
    );
  }

  return (
    <>
      {/* A plain anchor, not the localised Link: the dashboard is a separate
          app on its own origin, so this is not a route in this app. */}
      <a
        href={DASHBOARD_URL}
        className="bobr-navlink"
        tabIndex={tabIndex}
        style={{ fontSize: 'var(--bobr-text-body)', whiteSpace: 'nowrap' }}
      >
        {t('dashboard')}
      </a>

      <button
        type="button"
        className="bobr-navlink"
        tabIndex={tabIndex}
        onClick={() => {
          void signOut().then(() => {
            // Full reload rather than a client navigation: every server
            // component that rendered with a session has to be rebuilt without
            // one, and a soft push would leave the cached signed-in markup.
            window.location.assign('/');
          });
        }}
        style={{
          background: 'none',
          border: 0,
          padding: 0,
          font: 'inherit',
          fontSize: 'var(--bobr-text-body)',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        {tc('logout')}
      </button>
    </>
  );
}
