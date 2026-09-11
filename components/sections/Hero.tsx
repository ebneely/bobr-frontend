import { getTranslations } from 'next-intl/server';
import { EyebrowChip } from '@/components/ui/EyebrowChip';
import { Button } from '@/components/ui/Button';
import { Reveal } from '@/components/motion/Reveal';
import { Parallax } from '@/components/motion/Parallax';
import { PlaceholderMedia } from '@/components/ui/PlaceholderMedia';

/**
 * The explanatory hero. Per the spec this page is readable without an account;
 * everything its CTA leads to is not.
 *
 * Split layout, copy left and media right. The media is rounded heavily on its
 * left edge only, so it reads as a plate pushed in from the page edge rather
 * than as a rectangle.
 */
export async function Hero() {
  const t = await getTranslations('home');

  return (
    <section style={{ position: 'relative', background: 'var(--bobr-bg)' }}>
      <div
        className="bobr-shell"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 26rem), 1fr))',
          gap: 'clamp(2.5rem, 5vw, 4rem)',
          alignItems: 'center',
          paddingBlock: 'var(--bobr-section-y)',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
          <Reveal>
            <EyebrowChip>{t('eyebrow')}</EyebrowChip>
          </Reveal>

          <Reveal delay={0.08}>
            <h1 className="bobr-display">
              {t('titleLead')} <span className="bobr-em">{t('titleEm')}</span>
            </h1>
          </Reveal>

          <Reveal delay={0.16}>
            <p className="bobr-body" style={{ maxWidth: '34rem' }}>
              {t('subtitle')}
            </p>
          </Reveal>

          <Reveal delay={0.24}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem' }}>
              <Button href="/login">{t('cta')}</Button>
              <Button href="/#how" variant="outline">
                {t('ctaSecondary')}
              </Button>
            </div>
          </Reveal>
        </div>

        <Reveal distance="lg" delay={0.1}>
          <div style={{ position: 'relative' }}>
            <Parallax distance={-60}>
              <PlaceholderMedia
                tone="green"
                ratio="5 / 4"
                radius="var(--bobr-radius-half) var(--bobr-radius) var(--bobr-radius) var(--bobr-radius-half)"
              />
            </Parallax>

            {/* Circular stat badge overlapping the media's lower-left corner. */}
            <div
              style={{
                position: 'absolute',
                left: 'clamp(-1.5rem, -2vw, 0rem)',
                bottom: '2rem',
                width: 'clamp(6.5rem, 12vw, 8.5rem)',
                aspectRatio: '1',
                borderRadius: '50%',
                background: 'var(--bobr-fg)',
                color: 'var(--bobr-on-dark)',
                display: 'grid',
                placeItems: 'center',
                textAlign: 'center',
                boxShadow: 'var(--bobr-shadow)',
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 'var(--bobr-text-h3)',
                    fontWeight: 'var(--bobr-weight-bold)',
                    lineHeight: 1,
                  }}
                >
                  {t('statValue')}
                </div>
                <div
                  style={{
                    fontSize: 'var(--bobr-text-xs)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    marginTop: 6,
                    opacity: 0.85,
                  }}
                >
                  {t('statLabel')}
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
