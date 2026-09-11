import { getTranslations } from 'next-intl/server';
import { Button } from '@/components/ui/Button';
import { Reveal } from '@/components/motion/Reveal';

/**
 * The closing call to action: a full-bleed deep-green band.
 *
 * Inverted against the cream page so it lands as a full stop, and the button
 * takes the `light` variant because the solid green face would otherwise
 * disappear into the band behind it.
 */
export async function CtaBand() {
  const t = await getTranslations('ctaBand');

  return (
    <section style={{ background: 'var(--bobr-bg)' }}>
      <div className="bobr-shell">
        <Reveal distance="lg">
          <div
            style={{
              background: 'var(--bobr-fg)',
              color: 'var(--bobr-on-dark)',
              borderRadius: 'var(--bobr-radius-lg)',
              padding: 'clamp(2.5rem, 6vw, 4.5rem)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              gap: '1.5rem',
            }}
          >
            <h2 className="bobr-h2" style={{ color: 'inherit', maxWidth: '20ch' }}>
              {t('titleLead')} <span className="bobr-em">{t('titleEm')}</span>
            </h2>

            <p
              style={{
                maxWidth: '42ch',
                color: 'rgba(255, 250, 229, 0.76)',
                lineHeight: 'var(--bobr-lh-body)',
              }}
            >
              {t('body')}
            </p>

            <Button href="/login" variant="light">
              {t('cta')}
            </Button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
