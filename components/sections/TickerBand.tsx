import { getLocale, getTranslations } from 'next-intl/server';
import { mealName } from '@/lib/api/meals';
import { getMealsForServer } from '@/lib/api/server-meals';
import { Marquee } from '@/components/motion/Marquee';

/**
 * A thin scrolling band of diet names between sections.
 *
 * The ticker spec lives here rather than on the diet cards: an endlessly moving
 * track is good atmosphere and bad for anything a visitor has to read and
 * choose from. Nothing here is clickable, so nothing is lost by it moving.
 *
 * The whole band is aria-hidden — every word in it already appears as a real
 * heading in the carousel above, and a screen reader should not hear the
 * catalogue twice.
 */
export async function TickerBand() {
  const t = await getTranslations('mealTypes');
  const locale = await getLocale();
  // The admin's active meals, by name; the diet-type labels only while the
  // catalogue is empty, so the band never advertises something not on offer.
  const meals = await getMealsForServer();
  const words = [
    ...(meals.length > 0
      ? meals.map((meal) => mealName(meal, locale))
      : (['KETOGENIC', 'GLUTEN_FREE', 'ALLERGIES'] as const).map((type) => t(type))),
    t('CONSULTATION'),
  ];

  return (
    <div
      aria-hidden
      style={{
        background: 'var(--bobr-fg)',
        color: 'var(--bobr-cream-300)',
        paddingBlock: '1.25rem',
        borderBlock: '1px solid var(--bobr-green-900)',
      }}
    >
      <Marquee duration={28}>
        {words.map((word, i) => (
          <span
            key={`${i}-${word}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 'var(--bobr-ticker-gap)',
              fontSize: 'var(--bobr-text-h3)',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
              letterSpacing: '0.02em',
            }}
          >
            {word}
            {/* Separator dot, in the accent so the band has a pulse of colour
                as it passes rather than reading as one grey stripe. */}
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: 'var(--bobr-accent)',
                flexShrink: 0,
              }}
            />
          </span>
        ))}
      </Marquee>
    </div>
  );
}
