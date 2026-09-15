'use client';

import { useTranslations } from 'next-intl';

import { Link, usePathname } from '@/lib/i18n/navigation';

const TABS = [
  { href: '/account', key: 'overview' },
  { href: '/account/orders', key: 'orders' },
  { href: '/account/consultations', key: 'consultations' },
  { href: '/account/notes', key: 'notes' },
  { href: '/account/profile', key: 'profile' },
] as const;

/** Section tabs. An order detail page keeps "Orders" lit. */
export function AccountTabs() {
  const t = useTranslations('account');
  const pathname = usePathname();

  return (
    <nav aria-label={t('tabsLabel')} className="bobr-account-tabs">
      <ul>
        {TABS.map((tab) => {
          const exact = pathname === tab.href;
          const within = tab.href !== '/account' && pathname.startsWith(`${tab.href}/`);
          return (
            <li key={tab.key}>
              <Link
                href={tab.href}
                aria-current={exact ? 'page' : within ? 'true' : undefined}
              >
                {t(`tabs.${tab.key}`)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
