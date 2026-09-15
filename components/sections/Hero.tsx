import Image from 'next/image';
import { getTranslations } from 'next-intl/server';

import { EyebrowChip } from '@/components/ui/EyebrowChip';
import { Counter } from '@/components/motion/Counter';
import { SlideIn } from '@/components/motion/SlideIn';
import { PlaceholderMedia } from '@/components/ui/PlaceholderMedia';
import { Link } from '@/lib/i18n/navigation';
import { HERO_PLATE_SRC } from '@/lib/assets';

/**
 * The number of diet types on offer: ketogenic, gluten-free, allergies.
 *
 * A fact about the product, not a translatable string, so it lives here rather
 * than in the message catalogues where a translator could change 3 to 4 and
 * quietly make the badge lie.
 */
const DIET_TYPE_COUNT = 3;

/**
 * The explanatory home hero, rebuilt against maestroo.framer.ai (issue #22).
 *
 * Geometry, all in `.bobr-hero*` in globals.css and measured from the
 * reference at 1920x910 / 1440x900 / 390x844:
 *
 * - The section's height comes from the SCREEN (width, capped by height), not
 *   from padding, and the copy is centred in it.
 * - Only the copy sits in the page container. The photo box is positioned
 *   against the section itself: flush under the header, flush to the
 *   viewport's right edge, as tall as the section. The image is `fill` +
 *   `object-fit: cover`, so it crops rather than shrinks or letterboxes as the
 *   window changes shape.
 * - The stat circle hangs off the photo box's lower-left, not off the text.
 * - Under 900px the photo stacks under the copy as a full-width block.
 *
 * Motion: the photo box slides in from the right once, on arrival. The old
 * scroll parallax is gone — drifting the photo inside a box that must touch
 * the header and the right edge opens exactly the gaps this layout exists to
 * remove. The plate never rotates.
 */
export async function Hero() {
  const t = await getTranslations('home');

  return (
    <section className="bobr-hero">
      <div className="bobr-top-shell bobr-hero__shell">
        <div className="bobr-hero__copy">
          <EyebrowChip className="bobr-eyebrow--hero">{t('eyebrow')}</EyebrowChip>

          <h1 className="bobr-hero__title">
            {t('titleLead')} <strong className="bobr-em">{t('titleEm')}</strong>
          </h1>

          <p className="bobr-hero__body">
            {t.rich('subtitle', {
              b: (chunks) => <strong>{chunks}</strong>,
            })}
          </p>

          {/* The shared Button's face and offset, at the reference's larger
              hero size. Same classes, so the press interaction is identical;
              the size lives in `.bobr-hero__cta`. */}
          <Link href="/login" className="bobr-btn bobr-hero__cta">
            <span aria-hidden className="bobr-btn-offset" />
            <span className="bobr-btn-face">{t('cta')}</span>
          </Link>
        </div>
      </div>

      <div className="bobr-hero__media">
        <SlideIn delay={0.8} className="bobr-hero__slide">
          <div className="bobr-hero__frame">
            {HERO_PLATE_SRC ? (
              <Image
                src={HERO_PLATE_SRC}
                alt=""
                fill
                priority
                sizes="(max-width: 899px) 100vw, 53vw"
                className="bobr-hero__img"
              />
            ) : (
              /* No owned photography yet — see lib/assets.ts. */
              <PlaceholderMedia tone="green" ratio="auto" radius="0" />
            )}
          </div>

          <div className="bobr-hero__stat">
            <div className="bobr-hero__stat-core">
              <Counter
                to={DIET_TYPE_COUNT}
                className="bobr-hero__stat-value"
                // Counting to 3 over the two seconds a three-digit climb needs
                // reads as broken, so the duration matches the distance.
                duration={1.1}
              />
              <span className="bobr-hero__stat-label">{t('statLabel')}</span>
            </div>
          </div>
        </SlideIn>
      </div>
    </section>
  );
}
