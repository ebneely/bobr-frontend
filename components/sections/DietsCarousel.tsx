import { getLocale, getTranslations } from 'next-intl/server';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { Slider } from '@/components/ui/Slider';
import { PlaceholderMedia } from '@/components/ui/PlaceholderMedia';
import { Button } from '@/components/ui/Button';
import { RemoteImage } from '@/components/ui/RemoteImage';
import { mealDescription, mealName, type Meal } from '@/lib/api/meals';
import { formatGrosze } from '@/lib/api/orders';
import { getMealsForServer } from '@/lib/api/server-meals';
import { getPublicSettingsForServer } from '@/lib/api/server-settings';
import { localized } from '@/lib/api/settings';

/**
 * The diets on offer as a carousel, with their real prices (G11).
 *
 * A carousel rather than a ticker: these are the things a visitor is choosing
 * between, so they have to be able to stop on one and read it.
 *
 * The cards come from `GET /v1/meals` on the server (cached for five minutes),
 * so the price a visitor reads here is the catalogue price the order page
 * charges per day — the law on price display asks for exactly that, and a
 * price in the message catalogue would drift from it. With no meals (API down
 * or catalogue empty) the section falls back to the descriptive copy, without
 * prices or order buttons, rather than disappearing.
 */
export async function DietsCarousel() {
  const t = await getTranslations('diets');
  const locale = await getLocale();
  const [meals, settings] = await Promise.all([getMealsForServer(), getPublicSettingsForServer()]);
  // Doctor and price are the admin's settings; without them the card still
  // describes the service, just without figures.
  const consultationBody = settings
    ? t('CONSULTATION.bodyWithDoctor', { doctor: localized(settings.doctorName, locale) })
    : t('CONSULTATION.body');

  const tones = ['green', 'cream', 'orange'] as const;

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
          the track can run to the viewport edge and the next card peeks in. */}
      <Slider label={t('eyebrow')}>
        {meals.length > 0
          ? [
              ...meals.map((meal, i) => (
                <MealCard key={meal.id} meal={meal} locale={locale} tone={tones[i % tones.length]} />
              )),
              <StaticCard
                key="CONSULTATION"
                tone="green"
                name={t('CONSULTATION.name')}
                body={consultationBody}
                cta={t('consultationCta')}
                href="/consultation"
                price={settings ? formatGrosze(settings.consultationPriceGrosze, locale) : undefined}
                priceNote={settings ? t('perConsultation') : undefined}
              />,
            ]
          : (['KETOGENIC', 'GLUTEN_FREE', 'ALLERGIES', 'CONSULTATION'] as const).map((key, i) => (
              <StaticCard
                key={key}
                tone={i === 3 ? 'green' : tones[i]}
                name={t(`${key}.name`)}
                body={t(`${key}.body`)}
              />
            ))}
      </Slider>
    </section>
  );
}

const cardStyle = {
  height: '100%',
  background: 'var(--bobr-surface)',
  border: '1px solid var(--bobr-border)',
  borderRadius: 'var(--bobr-radius)',
  padding: '1rem',
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
} as const;

async function MealCard({
  meal,
  locale,
  tone,
}: {
  meal: Meal;
  locale: string;
  tone: 'green' | 'cream' | 'orange';
}) {
  const t = await getTranslations('diets');
  // The catalogue's own description when it has one; otherwise the site copy
  // for that diet type, which every known type has.
  const known = ['KETOGENIC', 'GLUTEN_FREE', 'ALLERGIES'].includes(meal.type);
  const body = mealDescription(meal, locale) ?? (known ? t(`${meal.type}.body`) : null);

  return (
    <article className="bobr-card" data-testid="diet-card" data-meal={meal.id} style={cardStyle}>
      <div className="bobr-card__media">
        {meal.imageUrl ? (
          // The slide is min(--bobr-ticker-item = 396px, 82vw) wide.
          <RemoteImage
            src={meal.imageUrl}
            srcSet={meal.imageSrcSet}
            width={meal.imageWidth}
            height={meal.imageHeight}
            ratio="4 / 3"
            sizes="(max-width: 483px) 82vw, 396px"
            alt=""
            fallback={<PlaceholderMedia tone={tone} ratio="4 / 3" />}
            style={{
              width: '100%',
              height: 'auto',
              aspectRatio: '4 / 3',
              objectFit: 'cover',
              display: 'block',
              borderRadius: 'calc(var(--bobr-radius) - 0.5rem)',
            }}
          />
        ) : (
          <PlaceholderMedia tone={tone} ratio="4 / 3" />
        )}
      </div>
      <div
        style={{
          padding: '0 0.5rem 0.75rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
          flex: '1 1 auto',
        }}
      >
        <h3 className="bobr-h4">{mealName(meal, locale)}</h3>
        {body && (
          <p className="bobr-body" style={{ fontSize: 'var(--bobr-text-sm)' }}>
            {body}
          </p>
        )}
        <Price amount={formatGrosze(meal.priceGrosze, locale)} note={t('perDay')} />
        <div style={{ paddingTop: '0.25rem' }}>
          <Button href={{ pathname: '/order', query: { meal: meal.id } }}>{t('orderCta')}</Button>
        </div>
      </div>
    </article>
  );
}

function StaticCard({
  tone,
  name,
  body,
  cta,
  href,
  price,
  priceNote,
}: {
  tone: 'green' | 'cream' | 'orange';
  name: string;
  body: string;
  cta?: string;
  href?: string;
  price?: string;
  priceNote?: string;
}) {
  return (
    <article className="bobr-card" style={cardStyle}>
      <div className="bobr-card__media">
        <PlaceholderMedia tone={tone} ratio="4 / 3" />
      </div>
      <div
        style={{
          padding: '0 0.5rem 0.75rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
          flex: '1 1 auto',
        }}
      >
        <h3 className="bobr-h4">{name}</h3>
        <p className="bobr-body" style={{ fontSize: 'var(--bobr-text-sm)' }}>
          {body}
        </p>
        {price && <Price amount={price} note={priceNote ?? ''} />}
        {cta && href && (
          <div style={{ paddingTop: '0.25rem' }}>
            <Button href={href} variant="outline">
              {cta}
            </Button>
          </div>
        )}
      </div>
    </article>
  );
}

/** The price line, pushed to the bottom of the card so prices align across cards. */
function Price({ amount, note }: { amount: string; note: string }) {
  return (
    <p
      data-testid="diet-price"
      style={{
        marginTop: 'auto',
        paddingTop: '0.5rem',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'baseline',
        gap: '0.375rem',
        color: 'var(--bobr-fg)',
      }}
    >
      <span style={{ fontSize: 'var(--bobr-text-h4)', fontWeight: 'var(--bobr-weight-bold)' }}>{amount}</span>
      <span style={{ fontSize: 'var(--bobr-text-sm)', color: 'var(--bobr-fg-muted)' }}>{note}</span>
    </p>
  );
}
