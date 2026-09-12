'use client';

import { useLocale, useTranslations } from 'next-intl';
import { Link, usePathname } from '@/lib/i18n/navigation';

/**
 * Language switch, deliberately OUTSIDE the navigation.
 *
 * It lives in the header bar at every width rather than inside the mobile
 * drawer: choosing a language is not a navigation choice, and on a phone a
 * Polish speaker who landed on the English page should not have to open a menu
 * they cannot read in order to fix that.
 *
 * It shows the flag of the language you would switch TO, not the one you are
 * already reading — the control is an action, and showing the current state
 * makes people click it to confirm rather than to change.
 */
export function LocaleSwitch({ className }: { className?: string }) {
  const t = useTranslations('common');
  const locale = useLocale();
  const pathname = usePathname();

  const target = locale === 'pl' ? 'en' : 'pl';
  const label = target === 'pl' ? t('switchToPl') : t('switchToEn');

  return (
    <Link
      // The SAME route in the other language. `href="/en"` would be prefixed
      // with the active locale and produce /pl/en.
      href={pathname}
      locale={target}
      aria-label={label}
      title={label}
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 44,
        height: 44,
        flexShrink: 0,
        borderRadius: 'var(--bobr-radius-control)',
        textDecoration: 'none',
        transition: 'background var(--bobr-duration) var(--bobr-ease)',
      }}
    >
      {/* 44px hit area, 26px flag. The target stays finger-sized while the
          glyph stays the size the design wants — shrinking the box to fit the
          artwork is how a control becomes hard to tap. */}
      {target === 'pl' ? <PolishFlag /> : <EnglishFlag />}
    </Link>
  );
}

const FLAG_W = 26;
const FLAG_H = 18;

/**
 * A hairline border, because both flags are half white and would otherwise
 * dissolve into the cream header with no edge at all.
 */
const frame = {
  borderRadius: 3,
  border: '1px solid var(--bobr-green-a12)',
  display: 'block',
} as const;

function PolishFlag() {
  return (
    <svg
      width={FLAG_W}
      height={FLAG_H}
      viewBox="0 0 26 18"
      style={frame}
      role="presentation"
      aria-hidden
    >
      <rect width="26" height="9" fill="#ffffff" />
      <rect y="9" width="26" height="9" fill="#d4213d" />
    </svg>
  );
}

function EnglishFlag() {
  return (
    <svg
      width={FLAG_W}
      height={FLAG_H}
      viewBox="0 0 26 18"
      style={frame}
      role="presentation"
      aria-hidden
    >
      <rect width="26" height="18" fill="#ffffff" />
      {/* St George's cross — the flag of England, which is what "English" asks
          for. The Union Flag is the United Kingdom's and would be the wrong
          answer to the question this control poses. */}
      <rect x="10" width="6" height="18" fill="#ce1124" />
      <rect y="6" width="26" height="6" fill="#ce1124" />
    </svg>
  );
}
