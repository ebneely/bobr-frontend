import Image from 'next/image';
import { getTranslations } from 'next-intl/server';

import { EyebrowChip } from '@/components/ui/EyebrowChip';
import { Button } from '@/components/ui/Button';
import { Reveal } from '@/components/motion/Reveal';
import { Parallax } from '@/components/motion/Parallax';
import { Counter } from '@/components/motion/Counter';
import { PlaceholderMedia } from '@/components/ui/PlaceholderMedia';
import { HERO_PLATE_SRC, HERO_PLATE_SIZE } from '@/lib/assets';

/**
 * The number of diet types on offer: ketogenic, gluten-free, allergies.
 *
 * A fact about the product, not a translatable string, so it lives here rather
 * than in the message catalogues where a translator could change 3 to 4 and
 * quietly make the badge lie.
 */
const DIET_TYPE_COUNT = 3;

/**
 * The explanatory hero. Per the spec this page is readable without an account;
 * everything its CTA leads to is not.
 *
 * Three independent motions run here at different rates, which is what keeps
 * the artwork from reading as a flat pasted cutout: the plate turns slowly, the
 * whole group drifts on scroll, and the badge counts up on entry.
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

          <Reveal index={1}>
            <h1 className="bobr-display">
              {t('titleLead')} <span className="bobr-em">{t('titleEm')}</span>
            </h1>
          </Reveal>

          <Reveal index={2}>
            <p className="bobr-body" style={{ maxWidth: '34rem' }}>
              {t('subtitle')}
            </p>
          </Reveal>

          <Reveal index={3}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem' }}>
              <Button href="/login">{t('cta')}</Button>
              <Button href="/#how" variant="outline">
                {t('ctaSecondary')}
              </Button>
            </div>
          </Reveal>
        </div>

        <Reveal distance="lg" index={1}>
          <div style={{ position: 'relative' }}>
            <Parallax ratio={0.15}>
              <div
                style={{
                  position: 'relative',
                  aspectRatio: '1',
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                {/* Ring behind the plate, counter-rotating so the two layers
                    shear against each other instead of moving as one object. */}
                <div
                  aria-hidden
                  className="bobr-plate-ring"
                  style={{
                    position: 'absolute',
                    inset: '6%',
                    borderRadius: '50%',
                    border: '1px dashed var(--bobr-green-a12)',
                  }}
                />

                {HERO_PLATE_SRC ? (
                  <Image
                    src={HERO_PLATE_SRC}
                    alt=""
                    width={HERO_PLATE_SIZE}
                    height={HERO_PLATE_SIZE}
                    priority
                    sizes="(max-width: 810px) 90vw, 45vw"
                    className="bobr-plate-spin"
                    style={{ width: '100%', height: 'auto' }}
                  />
                ) : (
                  /* No owned photography yet. The placeholder keeps the layout
                     and the choreography honest until a real cutout lands —
                     see lib/assets.ts for how to drop one in. */
                  <div
                    className="bobr-plate-spin"
                    style={{ width: '100%', borderRadius: '50%', overflow: 'hidden' }}
                  >
                    <PlaceholderMedia tone="green" ratio="1" radius="50%" />
                  </div>
                )}
              </div>
            </Parallax>

            {/* Counter badge, overlapping the plate's lower-left. */}
            <div
              style={{
                position: 'absolute',
                left: '2%',
                bottom: '8%',
                width: 110,
                height: 110,
                borderRadius: '50%',
                background: 'var(--bobr-fg)',
                color: 'var(--bobr-cream-300)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 2,
                boxShadow: 'var(--bobr-shadow)',
              }}
            >
              <Counter
                to={DIET_TYPE_COUNT}
                className="bobr-counter-value"
                // 2s is the measured figure for a three-digit climb. Counting
                // to 3 over two seconds reads as broken, so the duration
                // matches how far there actually is to go.
                duration={1.1}
              />
              <h2
                style={{
                  fontSize: 15,
                  fontWeight: 'var(--bobr-weight-medium)',
                  textTransform: 'capitalize',
                  textAlign: 'center',
                  lineHeight: 1.15,
                  maxWidth: '80%',
                }}
              >
                {t('statLabel')}
              </h2>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
