import { getTranslations } from 'next-intl/server';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { Reveal } from '@/components/motion/Reveal';
import { getPublicSettingsForServer } from '@/lib/api/server-settings';

interface LadderRow {
  key: string;
  days: string;
  note: string;
  discount: string;
}

/**
 * The commitment ladder: one-time, the calendar minimum, each discount tier and
 * the whole month — built from the admin's settings (`/v1/settings/public`,
 * ebneely/bobr-backend#57), so the page shows the tiers checkout applies.
 *
 * PRESENTATION ONLY: nothing here prices or validates anything; the server does
 * that on the quote. Without settings only the one-time row is shown rather
 * than a guessed ladder.
 */
export async function PricingLadder() {
  const t = await getTranslations('pricing');
  const settings = await getPublicSettingsForServer();
  const free = settings?.calendarFreeShipping ? 'yes' : 'no';

  const tiers: LadderRow[] = [
    { key: 'oneTime', days: t('oneTime.days'), note: t('oneTime.note'), discount: t('none') },
    ...(settings
      ? [
          {
            key: 'calendar',
            days: t('calendar.days', { minDays: settings.calendarMinDays }),
            note: t('calendar.note', { free }),
            discount: t('none'),
          },
          ...settings.discountTiers.map((tier) => ({
            key: `tier-${tier.minDays}`,
            days: t('tier.days', { days: tier.minDays }),
            note: t('tier.note', { free }),
            discount: `${tier.percent}%`,
          })),
          ...(settings.wholeMonthPercent > 0
            ? [
                {
                  key: 'month',
                  days: t('month.days'),
                  note: t('tier.note', { free }),
                  discount: `${settings.wholeMonthPercent}%`,
                },
              ]
            : []),
        ]
      : []),
  ];

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
              <Reveal key={tier.key} index={i} scale>
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
                      {tier.days}
                    </span>
                    <span
                      style={{
                        fontSize: 'var(--bobr-text-sm)',
                        color: featured ? 'rgba(255,250,229,0.72)' : 'var(--bobr-fg-muted)',
                      }}
                    >
                      {tier.note}
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
                    {tier.discount}
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
