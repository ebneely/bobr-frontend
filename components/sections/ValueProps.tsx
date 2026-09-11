import { getTranslations } from 'next-intl/server';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { Reveal } from '@/components/motion/Reveal';

/**
 * Three value cards on the alternate cream band.
 *
 * The cards stagger in at 80ms apart. That gap is deliberate: small enough that
 * the row still reads as one gesture, large enough that the eye is led left to
 * right rather than hit with three things at once.
 */
export async function ValueProps() {
  const t = await getTranslations('value');
  const keys = ['a', 'b', 'c'] as const;

  return (
    <section
      style={{
        background: 'var(--bobr-bg-alt)',
        paddingBlock: 'var(--bobr-section-y)',
      }}
    >
      <div
        className="bobr-shell"
        style={{ display: 'flex', flexDirection: 'column', gap: '3.5rem' }}
      >
        <SectionHeading
          eyebrow={t('eyebrow')}
          lead={t('titleLead')}
          em={t('titleEm')}
          body={t('body')}
        />

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 17rem), 1fr))',
            gap: '1.5rem',
          }}
        >
          {keys.map((key, i) => (
            <Reveal key={key} delay={i * 0.08}>
              <article
                className="bobr-card"
                style={{
                  height: '100%',
                  background: 'var(--bobr-surface)',
                  border: '1px solid var(--bobr-border)',
                  borderRadius: 'var(--bobr-radius)',
                  padding: '2rem 1.75rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.875rem',
                }}
              >
                {/* Index rather than an icon: BOBR has no icon set yet, and a
                    numeral is honest about the order these are read in. */}
                <span
                  aria-hidden
                  style={{
                    width: '3rem',
                    height: '3rem',
                    display: 'grid',
                    placeItems: 'center',
                    borderRadius: '50%',
                    background: 'var(--bobr-green-a06)',
                    color: 'var(--bobr-accent)',
                    fontSize: 'var(--bobr-text-lead)',
                    fontWeight: 'var(--bobr-weight-bold)',
                  }}
                >
                  {String(i + 1).padStart(2, '0')}
                </span>

                <h3 className="bobr-h4">{t(`${key}.title`)}</h3>
                <p className="bobr-body" style={{ fontSize: 'var(--bobr-text-sm)' }}>
                  {t(`${key}.body`)}
                </p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
