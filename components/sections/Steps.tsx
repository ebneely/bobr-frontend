import { getTranslations } from 'next-intl/server';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { Reveal } from '@/components/motion/Reveal';
import { Parallax } from '@/components/motion/Parallax';
import { PatternBackdrop } from '@/components/motion/PatternBackdrop';
import { PlaceholderMedia } from '@/components/ui/PlaceholderMedia';

/**
 * The four steps from account to first delivery, taken straight from the spec.
 *
 * Two columns: a drifting image on the left, the numbered steps on the right.
 * The image parallaxes upward as the band passes, so the two sides move at
 * different rates and the section gains depth without any extra artwork.
 */
export async function Steps() {
  const t = await getTranslations('steps');
  const steps = ['one', 'two', 'three', 'four'] as const;

  return (
    <section
      id="how"
      style={{
        background: 'var(--bobr-bg-alt)',
        paddingBlock: 'var(--bobr-section-y)',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <PatternBackdrop ratio={0.1} opacity={0.45} />

      <div
        className="bobr-shell"
        style={{
          // Lifted above the drifting backdrop, which sits at z-index 0.
          position: 'relative',
          zIndex: 1,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 24rem), 1fr))',
          gap: 'clamp(2.5rem, 5vw, 4.5rem)',
          alignItems: 'center',
        }}
      >
        <Reveal distance="lg">
          <Parallax ratio={0.15}>
            <PlaceholderMedia
              tone="cream"
              ratio="4 / 5"
              radius="var(--bobr-radius-lg)"
            />
          </Parallax>
        </Reveal>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
          <SectionHeading
            eyebrow={t('eyebrow')}
            lead={t('titleLead')}
            em={t('titleEm')}
          />

          <ol
            style={{
              listStyle: 'none',
              margin: 0,
              padding: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: '1.75rem',
            }}
          >
            {steps.map((step, i) => (
              <Reveal key={step} as="li" index={i}>
                <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start' }}>
                  <span
                    aria-hidden
                    style={{
                      flexShrink: 0,
                      width: '2.75rem',
                      height: '2.75rem',
                      display: 'grid',
                      placeItems: 'center',
                      borderRadius: '50%',
                      border: '1px solid var(--bobr-border-accent)',
                      color: 'var(--bobr-accent)',
                      fontWeight: 'var(--bobr-weight-bold)',
                    }}
                  >
                    {i + 1}
                  </span>
                  <div>
                    <h3 className="bobr-h4">{t(`${step}.title`)}</h3>
                    <p
                      className="bobr-body"
                      style={{ fontSize: 'var(--bobr-text-sm)', marginTop: '0.375rem' }}
                    >
                      {t(`${step}.body`)}
                    </p>
                  </div>
                </div>
              </Reveal>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
