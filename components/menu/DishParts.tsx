'use client';

import { useTranslations } from 'next-intl';

import type { MenuItem } from '@/lib/api/menu';

/**
 * The small pieces a dish is drawn from, shared by the menu card, the detail
 * dialog and the home teaser so the three never describe a dish differently.
 */

/**
 * The photograph, or a quiet plate when the kitchen has not shot the dish yet.
 * Never rotated or skewed: food photography is shown straight.
 */
export function DishMedia({ item, ratio = '4 / 3' }: { item: MenuItem; ratio?: string }) {
  return (
    <div className="bobr-dish-media" style={{ aspectRatio: ratio }}>
      {item.imageUrl ? (
        // A plain <img>, not next/image: served by the API or image host on
        // another origin, already resized there. alt="" because the dish name
        // is the heading right beside it — announcing it twice is noise.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.imageUrl} alt="" loading="lazy" decoding="async" />
      ) : (
        <span className="bobr-dish-plate" aria-hidden />
      )}
    </div>
  );
}

export function DietBadge({ diet }: { diet: MenuItem['diet'] }) {
  const t = useTranslations('menu.diet');
  if (!diet) return null;
  return <span className="bobr-diet-badge">{t(diet)}</span>;
}

/**
 * kcal first and a little heavier, then the three macros as small figures. The
 * letters are abbreviations with their full name for assistive tech and on
 * hover; tabular numerals so a column of cards lines its numbers up.
 */
export function NutritionLine({ item }: { item: MenuItem }) {
  const t = useTranslations('menu');
  const macros = [
    { value: item.proteinG, short: t('proteinShort'), long: t('protein') },
    { value: item.fatG, short: t('fatShort'), long: t('fat') },
    { value: item.carbsG, short: t('carbsShort'), long: t('carbs') },
  ].filter((m): m is { value: number; short: string; long: string } => m.value !== null);

  if (item.kcal === null && macros.length === 0) return null;

  return (
    <p className="bobr-nutrition">
      {item.kcal !== null && (
        <span className="bobr-nutrition__kcal">{t('kcal', { value: item.kcal })}</span>
      )}
      {macros.map((m) => (
        <span key={m.short} className="bobr-nutrition__macro">
          <abbr title={m.long} aria-label={m.long}>
            {m.short}
          </abbr>{' '}
          {t('grams', { value: m.value })}
        </span>
      ))}
    </p>
  );
}

export function AllergenMarks({ item }: { item: MenuItem }) {
  const t = useTranslations('menu');
  if (item.allergens.length === 0) return null;
  return (
    <p className="bobr-allergen-marks">
      <span className="bobr-sr-only">{t('allergens')}: </span>
      {item.allergens.map((a, i) => (
        <span key={a} className="bobr-allergen-mark">
          {t(`allergen.${a}`)}
          {i < item.allergens.length - 1 && <span className="bobr-sr-only">, </span>}
        </span>
      ))}
    </p>
  );
}
