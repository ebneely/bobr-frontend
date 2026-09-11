import Image from 'next/image';
import { getTranslations } from 'next-intl/server';

import { EyebrowChip } from '@/components/ui/EyebrowChip';
import { Button } from '@/components/ui/Button';
import { Parallax } from '@/components/motion/Parallax';
import { Counter } from '@/components/motion/Counter';
import { SlideIn } from '@/components/motion/SlideIn';
import { PlaceholderMedia } from '@/components/ui/PlaceholderMedia';
import {
  HERO_PLATE_SRC,
  HERO_PLATE_WIDTH,
  HERO_PLATE_HEIGHT,
} from '@/lib/assets';

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
 * Exactly one thing animates on arrival, matching the reference's appear
 * manifest: the media block slides in from the right after a 0.8s delay. The
 * copy is present from the first paint.
 *
 * Two further motions are scroll- or view-driven rather than entrances: the
 * media drifts as the page scrolls, and the badge counts up when it is seen.
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
        {/* No entrance on the copy column, deliberately.
            The appear-animation manifest defines exactly ONE animated element
            in this section — the media block. The heading, body and buttons are
            simply present on load: they are the first thing to read, and
            holding them back behind a 0.8s delay costs the visitor the content
            they came for in exchange for motion nobody asked for. */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            // Children size to their content instead of stretching. Without
            // this the eyebrow chip — an inline-block in a flex column — is
            // stretched to the full column width and stops reading as a chip.
            alignItems: 'flex-start',
            gap: '1.75rem',
          }}
        >
          <EyebrowChip>{t('eyebrow')}</EyebrowChip>

          <h1 className="bobr-display">
            {t('titleLead')} <span className="bobr-em">{t('titleEm')}</span>
          </h1>

          <p className="bobr-body" style={{ maxWidth: '34rem' }}>
            {t('subtitle')}
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem' }}>
            <Button href="/login">{t('cta')}</Button>
            <Button href="/#how" variant="outline">
              {t('ctaSecondary')}
            </Button>
          </div>
        </div>

        {/* The media enters horizontally on load, after the copy has had a
            moment to settle — hence the delay. Reveal is for scroll entrances
            and would be wrong here: this is above the fold, so it must animate
            as the page arrives rather than wait for an intersection that has
            already happened. */}
        <SlideIn delay={0.8}>
          <div style={{ position: 'relative' }}>
            <Parallax ratio={0.15}>
              <div
                style={{
                  position: 'relative',
                  aspectRatio: '1',
                  display: 'grid',
                  placeItems: 'center',
                  // Half-round on the leading edge only, so the media reads as a
                  // plate pushed in from the page edge rather than a rectangle.
                  // Clipped here, unlike the reference, which leaves overflow
                  // visible because its radius shapes a background rather than
                  // an <img> that would otherwise spill past the curve.
                  borderStartStartRadius: 'var(--bobr-radius-half)',
                  borderEndStartRadius: 'var(--bobr-radius-half)',
                  overflow: 'hidden',
                }}
              >
                {/* No rotation. The plate slides in and stays put.
                    A continuous spin only works on a cutout that is genuinely
                    circular; this one carries the cloth and the grinders with
                    it, so turning it reads as a crooked photograph rather than
                    as motion. */}
                {HERO_PLATE_SRC ? (
                  <Image
                    src={HERO_PLATE_SRC}
                    alt=""
                    width={HERO_PLATE_WIDTH}
                    height={HERO_PLATE_HEIGHT}
                    priority
                    sizes="(max-width: 810px) 90vw, 45vw"
                    style={{ width: '100%', height: 'auto' }}
                  />
                ) : (
                  /* No owned photography yet. The placeholder keeps the layout
                     and the choreography honest until a real cutout lands —
                     see lib/assets.ts for how to drop one in. */
                  <div style={{ width: '100%' }}>
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
        </SlideIn>
      </div>
    </section>
  );
}
