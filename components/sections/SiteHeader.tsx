'use client';

import { useTranslations, useLocale } from 'next-intl';
import { Link, usePathname } from '@/lib/i18n/navigation';
import { useScrolled } from '@/lib/motion/use-scrolled';

/**
 * Sticky header.
 *
 * Transparent over the hero so the artwork runs full-bleed behind it, gaining a
 * translucent background and a hairline border once the page has scrolled.
 *
 * The scroll state comes from a passive listener rather than a rAF loop: it is
 * a boolean that flips once, and `passive` tells the browser the handler will
 * never preventDefault, which keeps it off the scroll's critical path.
 */
export function SiteHeader() {
  const t = useTranslations('nav');
  const tc = useTranslations('common');
  const locale = useLocale();
  const pathname = usePathname();
  const stuck = useScrolled(24);

  const items = [
    { href: '/', label: t('home') },
    { href: '/#how', label: t('howItWorks') },
    { href: '/#diets', label: t('diets') },
    { href: '/#pricing', label: t('pricing') },
  ];

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: stuck ? 'rgba(255, 250, 229, 0.92)' : 'transparent',
        backdropFilter: stuck ? 'saturate(180%) blur(12px)' : 'none',
        borderBottom: `1px solid ${stuck ? 'var(--bobr-border)' : 'transparent'}`,
        transition:
          'background var(--bobr-duration) var(--bobr-ease), border-color var(--bobr-duration) var(--bobr-ease)',
      }}
    >
      <div
        className="bobr-shell"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1.5rem',
          paddingBlock: '1.125rem',
        }}
      >
        <Link
          href="/"
          style={{
            fontSize: 'var(--bobr-text-h4)',
            fontWeight: 'var(--bobr-weight-bold)',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'var(--bobr-fg)',
            textDecoration: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          {tc('appName')}
        </Link>

        <nav
          aria-label={t('home')}
          style={{
            display: 'flex',
            gap: 'clamp(1rem, 2.5vw, 2rem)',
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="bobr-navlink"
              data-active={pathname === item.href ? 'true' : undefined}
              style={{ fontSize: 'var(--bobr-text-body)' }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          {/* Switches locale for the SAME route. An href of "/en" would be
              prefixed with the active locale and produce /pl/en. */}
          <Link
            href="/"
            locale={locale === 'pl' ? 'en' : 'pl'}
            className="bobr-navlink"
            style={{
              fontSize: 'var(--bobr-text-sm)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            {locale === 'pl' ? 'EN' : 'PL'}
          </Link>

          <Link
            href="/login"
            className="bobr-navlink"
            style={{ fontSize: 'var(--bobr-text-body)', whiteSpace: 'nowrap' }}
          >
            {tc('login')}
          </Link>
        </div>
      </div>
    </header>
  );
}
