import Image from 'next/image';
import { getTranslations } from 'next-intl/server';

import { EyebrowChip } from '@/components/ui/EyebrowChip';
import { Counter } from '@/components/motion/Counter';
import { SlideIn } from '@/components/motion/SlideIn';
import { PlaceholderMedia } from '@/components/ui/PlaceholderMedia';
import { RemoteImage } from '@/components/ui/RemoteImage';
import { getMealsForServer } from '@/lib/api/server-meals';
import { getPublicSettingsForServer } from '@/lib/api/server-settings';
import { Link } from '@/lib/i18n/navigation';
import { HERO_PLATE_SRC } from '@/lib/assets';

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
  const [meals, settings] = await Promise.all([getMealsForServer(), getPublicSettingsForServer()]);
  // Diet types actually on offer, counted from the admin's active meals — not
  // a constant that goes stale the day a diet is added or retired.
  const dietTypeCount = new Set(meals.map((meal) => meal.type)).size;
  // The admin's hero photo when one is uploaded; the bundled plate otherwise.
  const hero = settings?.heroImage ?? null;

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
          <Link href="/order" className="bobr-btn bobr-hero__cta">
            <span aria-hidden className="bobr-btn-offset" />
            <span className="bobr-btn-face">{t('cta')}</span>
          </Link>
        </div>
      </div>

      <div className="bobr-hero__media">
        <SlideIn delay={0.8} className="bobr-hero__slide">
          <div className="bobr-hero__frame">
            {hero ? (
              <RemoteImage
                src={hero.url}
                srcSet={hero.srcSet}
                width={hero.width}
                height={hero.height}
                alt=""
                priority
                sizes="(max-width: 899px) 100vw, 53vw"
                className="bobr-hero__img"
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
                fallback={<PlaceholderMedia tone="green" ratio="auto" radius="0" />}
              />
            ) : HERO_PLATE_SRC ? (
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

          {dietTypeCount > 0 && (
          <div className="bobr-hero__stat">
            <div className="bobr-hero__stat-core">
              <Counter
                to={dietTypeCount}
                className="bobr-hero__stat-value"
                // Counting to 3 over the two seconds a three-digit climb needs
                // reads as broken, so the duration matches the distance.
                duration={1.1}
              />
              <span className="bobr-hero__stat-label">{t('statLabel')}</span>
            </div>
          </div>
          )}
        </SlideIn>
      </div>
    </section>
  );
}
