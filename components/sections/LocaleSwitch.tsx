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
 * It shows the flag AND the code of the language you would switch TO, not the
 * one you are already reading — the control is an action, and showing the
 * current state makes people click it to confirm rather than to change.
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
      className={className ? `bobr-locale ${className}` : 'bobr-locale'}
    >
      {/* The flag sits in the header's icon tile; the hit area around it stays
          44px tall (see `.bobr-locale`) so the target is finger-sized while
          the glyph stays the size the design wants. */}
      <span aria-hidden className="bobr-topslot__tile">
        {target === 'pl' ? <PolishFlag /> : <BritishFlag />}
      </span>

      {/* The code names the language the flag stands for, which a flag alone
          does not: the Union Flag is a country, not "English". It is decorative
          to a screen reader — the link's aria-label already says the whole
          thing, and announcing "EN" after it would just be noise. */}
      <span aria-hidden className="bobr-locale__code">
        {target === 'pl' ? 'PL' : 'EN'}
      </span>
    </Link>
  );
}

const FLAG_W = 20;
const FLAG_H = 14;

/**
 * A hairline border, because both flags are half white and would otherwise
 * dissolve into the cream header with no edge at all.
 */
const frame = {
  borderRadius: 2,
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

/**
 * The Union Flag, for English.
 *
 * Drawn as strokes rather than filled paths so the layering reads at 18px:
 * blue field, white saltire, red saltire, then the white-bordered red cross
 * over the top. The real flag counterchanges the red saltire — offsetting it
 * either side of the diagonal — which is invisible at this size and would cost
 * a dozen clip paths to express.
 *
 * Squared to the same 26x18 box as the Polish flag. The true ratio is 1:2, so
 * this is slightly tall, but matching icon boxes reads better in a header than
 * two flags of different heights.
 */
function BritishFlag() {
  return (
    <svg
      width={FLAG_W}
      height={FLAG_H}
      viewBox="0 0 26 18"
      style={frame}
      role="presentation"
      aria-hidden
    >
      <rect width="26" height="18" fill="#012169" />
      <g strokeLinecap="butt">
        <path d="M0 0 L26 18 M26 0 L0 18" stroke="#ffffff" strokeWidth="4.2" />
        <path d="M0 0 L26 18 M26 0 L0 18" stroke="#c8102e" strokeWidth="1.7" />
        <path d="M13 0 V18 M0 9 H26" stroke="#ffffff" strokeWidth="6" />
        <path d="M13 0 V18 M0 9 H26" stroke="#c8102e" strokeWidth="3.6" />
      </g>
    </svg>
  );
}
