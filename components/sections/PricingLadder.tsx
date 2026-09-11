import { getTranslations } from 'next-intl/server';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { Reveal } from '@/components/motion/Reveal';

/**
 * The commitment ladder from the spec: one-time, then the calendar tiers at
 * 5 / 10 / 20 days and a whole month.
 *
 * PRESENTATION ONLY. These rows render strings from the message catalogue —
 * nothing here computes a price, applies a discount, or validates a selection.
 * The actual rules are still being decided (docs/SPEC.md carries an open
 * question about whether the five-meal minimum and the "+4 days" threshold are
 * one rule or two), so putting arithmetic here would bake in a guess.
 */
export async function PricingLadder() {
  const t = await getTranslations('pricing');
  const tiers = ['t1', 't2', 't3', 't4', 't5'] as const;

  return (
    <section
      id="pricing"
      style={{ background: 'var(--bobr-bg)', paddingBlock: 'var(--bobr-section-y)' }}
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
          align="center"
        />

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          {tiers.map((tier, i) => {
            // The last tier is the one being steered toward, so it inverts.
            const featured = i === tiers.length - 1;

            return (
              <Reveal key={tier} delay={i * 0.06}>
                <div
                  className="bobr-card"
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '1rem',
                    padding: '1.5rem 1.75rem',
                    borderRadius: 'var(--bobr-radius)',
                    border: `1px solid ${featured ? 'transparent' : 'var(--bobr-border)'}`,
                    background: featured ? 'var(--bobr-fg)' : 'var(--bobr-surface)',
                    color: featured ? 'var(--bobr-on-dark)' : 'var(--bobr-fg)',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <span
                      style={{
                        fontSize: 'var(--bobr-text-h4)',
                        fontWeight: 'var(--bobr-weight-semibold)',
                      }}
                    >
                      {t(`${tier}.days`)}
                    </span>
                    <span
                      style={{
                        fontSize: 'var(--bobr-text-sm)',
                        color: featured ? 'rgba(255,250,229,0.72)' : 'var(--bobr-fg-muted)',
                      }}
                    >
                      {t(`${tier}.note`)}
                    </span>
                  </div>

                  <span
                    style={{
                      fontSize: 'var(--bobr-text-h3)',
                      fontWeight: 'var(--bobr-weight-bold)',
                      lineHeight: 1,
                      // Accent on both grounds: it clears contrast against the
                      // cream surface and against the deep green of the
                      // featured row, so it needs no variant.
                      color: 'var(--bobr-accent)',
                    }}
                  >
                    {t(`${tier}.discount`)}
                  </span>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
