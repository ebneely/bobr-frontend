import { getTranslations } from 'next-intl/server';
import { Link } from '@/lib/i18n/navigation';

export async function SiteFooter() {
  const t = await getTranslations('footer');
  const tn = await getTranslations('nav');
  const tc = await getTranslations('common');

  const links = [
    { href: '/menu', label: tn('menu') },
    { href: '/#how', label: tn('howItWorks') },
    { href: '/#diets', label: tn('diets') },
    { href: '/#pricing', label: tn('pricing') },
    { href: '/login', label: tc('login') },
  ];

  return (
    <footer
      style={{
        background: 'var(--bobr-bg-alt)',
        borderTop: '1px solid var(--bobr-border)',
        paddingBlock: 'clamp(3rem, 6vw, 4.5rem) 2rem',
      }}
    >
      <div
        className="bobr-shell"
        style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 15rem), 1fr))',
            gap: '2rem',
          }}
        >
          <div>
            <div
              style={{
                fontSize: 'var(--bobr-text-h4)',
                fontWeight: 'var(--bobr-weight-bold)',
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
              }}
            >
              {tc('appName')}
            </div>
            <p
              className="bobr-body"
              style={{ fontSize: 'var(--bobr-text-sm)', marginTop: '0.75rem', maxWidth: '26ch' }}
            >
              {t('tagline')}
            </p>
          </div>

          <nav aria-label={t('links')}>
            <h2
              className="bobr-h4"
              style={{ fontSize: 'var(--bobr-text-body)', marginBottom: '0.875rem' }}
            >
              {t('links')}
            </h2>
            <ul
              style={{
                listStyle: 'none',
                margin: 0,
                padding: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: '0.625rem',
              }}
            >
              {links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="bobr-navlink"
                    style={{ fontSize: 'var(--bobr-text-sm)' }}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <h2
              className="bobr-h4"
              style={{ fontSize: 'var(--bobr-text-body)', marginBottom: '0.875rem' }}
            >
              {t('contact')}
            </h2>
            {/* Placeholder until the real address and number are supplied. */}
            <p className="bobr-body" style={{ fontSize: 'var(--bobr-text-sm)' }}>
              kontakt@bobr.pl
            </p>
          </div>
        </div>

        <div
          style={{
            borderTop: '1px solid var(--bobr-border)',
            paddingTop: '1.5rem',
            fontSize: 'var(--bobr-text-xs)',
            color: 'var(--bobr-fg-muted)',
          }}
        >
          &copy; {new Date().getFullYear()} {tc('appName')}. {t('rights')}
        </div>
      </div>
    </footer>
  );
}
