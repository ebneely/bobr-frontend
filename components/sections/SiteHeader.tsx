'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/lib/i18n/navigation';
import { useScrolled } from '@/lib/motion/use-scrolled';
import { LocaleSwitch } from './LocaleSwitch';
import { AccountNav } from './AccountNav';
import { getLenis } from '@/components/motion/SmoothScroll';

/**
 * Fixed header with a desktop bar and a mobile drawer.
 *
 * Which of the two shows is decided by a CSS media query at 810px, not by
 * measuring the window in JS: a JS breakpoint cannot run until hydration, so
 * the first paint would show the wrong navigation and then swap.
 */
export function SiteHeader() {
  const t = useTranslations('nav');
  const tc = useTranslations('common');
  const pathname = usePathname();
  const stuck = useScrolled(24);

  const [open, setOpen] = useState(false);
  const [openedAt, setOpenedAt] = useState(pathname);
  const drawerId = useId();
  const toggleRef = useRef<HTMLButtonElement | null>(null);

  // Close on navigation, or the drawer stays open over the section the user
  // just asked to see. This covers back/forward and locale switches, not only
  // the in-drawer links that close themselves on click.
  //
  // Adjusted during render rather than in an effect: React re-runs this
  // component immediately, before the browser paints, so the drawer is never
  // shown open on the new route. The effect version renders it open once and
  // closes it a frame later, which is a visible flash.
  if (openedAt !== pathname) {
    setOpenedAt(pathname);
    if (open) setOpen(false);
  }

  const items = [
    { href: '/', label: t('home') },
    { href: '/menu', label: t('menu') },
    { href: '/#how', label: t('howItWorks') },
    { href: '/#diets', label: t('diets') },
    { href: '/#pricing', label: t('pricing') },
    { href: '/consultation', label: t('consultation') },
  ];

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setOpen(false);
      // Focus goes back to the control that opened it, or it lands on <body>
      // and the next Tab restarts from the top of the page.
      toggleRef.current?.focus();
    };

    document.addEventListener('keydown', onKeyDown);

    // Lenis owns the scroll, so `overflow: hidden` on body does not stop it —
    // it keeps driving the page behind the open drawer. It has to be told.
    const lenis = getLenis();
    lenis?.stop();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      lenis?.start();
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  return (
    <>
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          height: 'var(--bobr-header-h)',
          background:
            stuck || open ? 'rgba(255, 250, 229, 0.92)' : 'transparent',
          backdropFilter: stuck || open ? 'saturate(180%) blur(12px)' : 'none',
          borderBottom: `1px solid ${stuck ? 'var(--bobr-border)' : 'transparent'}`,
          transition:
            'background var(--bobr-duration) var(--bobr-ease), border-color var(--bobr-duration) var(--bobr-ease)',
        }}
      >
        <div
          className="bobr-shell"
          style={{
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1.5rem',
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
            aria-label={t('primary')}
            className="bobr-nav-desktop"
            style={{ gap: 'clamp(1rem, 2.5vw, 2rem)', alignItems: 'center' }}
          >
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="bobr-navlink"
                data-active={pathname === item.href ? 'true' : undefined}
                aria-current={pathname === item.href ? 'page' : undefined}
                style={{ fontSize: 'var(--bobr-text-body)' }}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div
            className="bobr-nav-desktop"
            style={{ alignItems: 'center', gap: '1.25rem' }}
          >
            <AccountNav />
          </div>

          {/* Outside both navs and outside the drawer, so it is reachable at
              every width. Language is not a navigation choice, and a Polish
              speaker who lands on the English page should not have to open a
              menu written in English to get back. */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              flexShrink: 0,
            }}
          >
            <LocaleSwitch />

            <button
              ref={toggleRef}
              type="button"
              className="bobr-nav-toggle"
            aria-expanded={open}
            aria-controls={drawerId}
            aria-label={open ? t('menuClose') : t('menuOpen')}
            onClick={() => setOpen((v) => !v)}
            style={{
              alignItems: 'center',
              justifyContent: 'center',
              width: 44,
              height: 44,
              background: 'none',
              border: 0,
              padding: 0,
              cursor: 'pointer',
            }}
          >
              <span className="bobr-burger" aria-hidden>
                <span />
                <span />
                <span />
              </span>
            </button>
          </div>
        </div>
      </header>

      <div
        id={drawerId}
        className="bobr-drawer"
        data-open={open ? 'true' : 'false'}
        // Hidden from assistive tech while closed, matching the visibility
        // transition that also makes it untabbable.
        aria-hidden={!open}
      >
        <nav
          aria-label={t('primary')}
          className="bobr-shell"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.25rem',
            paddingBlock: '2rem',
          }}
        >
          {items.map((item, i) => (
            <Link
              key={item.href}
              href={item.href}
              className="bobr-drawer-link"
              data-active={pathname === item.href ? 'true' : undefined}
              aria-current={pathname === item.href ? 'page' : undefined}
              style={{
                ['--i' as string]: i,
                fontSize: 'var(--bobr-text-h3)',
                textTransform: 'uppercase',
                color: 'var(--bobr-fg)',
                textDecoration: 'none',
                paddingBlock: '0.5rem',
              }}
              tabIndex={open ? undefined : -1}
              onClick={() => setOpen(false)}
            >
              {item.label}
            </Link>
          ))}

          <div
            className="bobr-drawer-link"
            style={{
              ['--i' as string]: items.length,
              display: 'flex',
              alignItems: 'center',
              gap: '1.5rem',
              marginTop: '1.5rem',
              paddingTop: '1.5rem',
              borderTop: '1px solid var(--bobr-border)',
            }}
          >
            {/* No language switch here — it lives in the header bar at every
                width now, so it is not buried in a drawer. */}
            <AccountNav tabIndex={open ? undefined : -1} />
          </div>
        </nav>
      </div>
    </>
  );
}
