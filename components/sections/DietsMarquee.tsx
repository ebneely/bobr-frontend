import { getTranslations } from 'next-intl/server';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { Marquee } from '@/components/motion/Marquee';
import { PlaceholderMedia } from '@/components/ui/PlaceholderMedia';

/**
 * The four diet types, running as an infinite ticker.
 *
 * A marquee rather than a static grid because there are only four items: a grid
 * of four leaves a lot of empty band, where a moving track fills the full width
 * at any viewport and hints there is more to browse. It pauses on hover so a
 * card can actually be read.
 *
 * The list is duplicated inside Marquee to close the loop, and the second copy
 * is aria-hidden, so assistive tech hears four diets rather than eight.
 */
export async function DietsMarquee() {
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

      <Marquee duration={44} gap="1.5rem">
        {diets.map((diet) => (
          <article
            key={diet.key}
            className="bobr-card"
            style={{
              width: 'clamp(16rem, 24vw, 21.5rem)',
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
      </Marquee>
    </section>
  );
}
