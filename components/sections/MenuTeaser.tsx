'use client';

import { useTranslations } from 'next-intl';

import { Link } from '@/lib/i18n/navigation';
import { useMenu } from '@/lib/hooks/use-menu';
import { EMPTY_MENU_FILTERS, selectTeaserDishes } from '@/lib/menu';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { Button } from '@/components/ui/Button';
import { Reveal } from '@/components/motion/Reveal';
import { DishMedia, NutritionLine } from '@/components/menu/DishParts';
import { ArrowIcon } from '@/components/menu/MenuIcons';

/**
 * "From this week" on the home page: a few dishes that read as one day, strung
 * on the same line as the menu page's timeline, and a way into the full menu.
 *
 * It renders NOTHING while loading, when the menu is empty and when the call
 * fails. A teaser is an invitation; a skeleton or an apology in the middle of
 * the home page would advertise a problem to someone who never asked about the
 * menu. Each dish links to the menu already searched for that dish.
 */
export function MenuTeaser() {
  const t = useTranslations('menu');
  const { data, isError } = useMenu(EMPTY_MENU_FILTERS);

  const dishes = data && !isError ? selectTeaserDishes(data.items, 4) : [];
  if (dishes.length === 0) return null;

  return (
    <section className="bobr-teaser" id="menu">
      <div className="bobr-shell">
        <div className="bobr-teaser__head">
          <SectionHeading
            eyebrow={t('teaser.eyebrow')}
            lead={t('teaser.lead')}
            em={t('teaser.em')}
            body={t('teaser.body')}
          />
          <Reveal index={2} className="bobr-teaser__cta">
            <Button href="/menu">
              <span className="bobr-btn-label">
                {t('teaser.cta')}
                <ArrowIcon />
              </span>
            </Button>
          </Reveal>
        </div>

        <ol className="bobr-teaser__day" style={{ ['--n' as string]: dishes.length }}>
          {dishes.map((dish, i) => (
            <Reveal as="li" key={dish.id} index={i} scale className="bobr-teaser__stop">
              <p className="bobr-teaser__course">
                <span className="bobr-teaser__dot" aria-hidden />
                {t(`course.${dish.course}`)}
              </p>
              <Link
                href={{ pathname: '/menu', query: { q: dish.name } }}
                className="bobr-teaser__card bobr-card"
                aria-label={t('teaser.dishLink', { name: dish.name })}
              >
                <div className="bobr-card__media">
                  <DishMedia
                    item={dish}
                    ratio="5 / 4"
                    // A 17rem scroll strip on phones, then --n equal columns.
                    sizes={`(max-width: 47.5rem) 17rem, ${Math.ceil(100 / Math.max(dishes.length, 1))}vw`}
                  />
                </div>
                <span className="bobr-teaser__name">{dish.name}</span>
                <NutritionLine item={dish} />
              </Link>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}
