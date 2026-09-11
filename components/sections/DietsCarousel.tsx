import { getTranslations } from 'next-intl/server';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { Slider } from '@/components/ui/Slider';
import { PlaceholderMedia } from '@/components/ui/PlaceholderMedia';

/**
 * The four diet types as a carousel.
 *
 * A carousel rather than the ticker that used to be here: these are the things
 * a visitor is choosing between, so they have to be able to stop on one and
 * read it. A track that never stops is fine for atmosphere and wrong for a
 * decision — the ticker moved to TickerBand, where it carries no choice.
 */
export async function DietsCarousel() {
  const t = await getTranslations('diets');

  const diets = [
    { key: 'KETOGENIC', tone: 'green' },
    { key: 'GLUTEN_FREE', tone: 'cream' },
    { key: 'ALLERGIES', tone: 'orange' },
    { key: 'CONSULTATION', tone: 'green' },
  ] as const;

  return (
    <section
      id="diets"
      style={{ background: 'var(--bobr-bg)', paddingBlock: 'var(--bobr-section-y)' }}
    >
      <div className="bobr-shell" style={{ marginBottom: '3.5rem' }}>
        <SectionHeading
          eyebrow={t('eyebrow')}
          lead={t('titleLead')}
          em={t('titleEm')}
          align="center"
        />
      </div>

      {/* Full-bleed: the Slider supplies its own gutter as scroll padding, so
          the track can run to the viewport edge and the next card peeks in,
          which is what tells a visitor there is more to scroll. */}
      <Slider label={t('eyebrow')}>
        {diets.map((diet) => (
          <article
            key={diet.key}
            className="bobr-card"
            style={{
              height: '100%',
              background: 'var(--bobr-surface)',
              border: '1px solid var(--bobr-border)',
              borderRadius: 'var(--bobr-radius)',
              padding: '1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
          >
            <div className="bobr-card__media">
              <PlaceholderMedia tone={diet.tone} ratio="4 / 3" />
            </div>
            <div style={{ padding: '0 0.5rem 0.75rem' }}>
              <h3 className="bobr-h4">{t(`${diet.key}.name`)}</h3>
              <p
                className="bobr-body"
                style={{ fontSize: 'var(--bobr-text-sm)', marginTop: '0.5rem' }}
              >
                {t(`${diet.key}.body`)}
              </p>
            </div>
          </article>
        ))}
      </Slider>
    </section>
  );
}
