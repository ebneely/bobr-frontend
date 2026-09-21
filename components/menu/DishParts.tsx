'use client';

import { useTranslations } from 'next-intl';

import type { MenuItem } from '@/lib/api/menu';
import { RemoteImage } from '@/components/ui/RemoteImage';

/**
 * The small pieces a dish is drawn from, shared by the menu card, the detail
 * dialog and the home teaser so the three never describe a dish differently.
 */

/**
 * `sizes` for a card in the menu page's dish grid (auto-fill, 15.5rem min):
 * one column up to ~36rem, two up to ~64rem, then 3–4 columns of at most
 * ~21rem. Erring high, as RemoteImage asks.
 */
const DISH_GRID_SIZES = '(max-width: 36rem) 100vw, (max-width: 64rem) 50vw, 22rem';

/**
 * The photograph, or a quiet plate when the kitchen has not shot the dish yet.
 * Never rotated or skewed: food photography is shown straight.
 *
 * The frame's fixed ratio reserves the space and the photo is cropped into it,
 * so a card never shifts when its photo arrives.
 */
export function DishMedia({
  item,
  ratio = '4 / 3',
  sizes = DISH_GRID_SIZES,
}: {
  item: MenuItem;
  ratio?: string;
  sizes?: string;
}) {
  const plate = <span className="bobr-dish-plate" aria-hidden />;
  return (
    <div className="bobr-dish-media" style={{ aspectRatio: ratio }}>
      {item.imageUrl ? (
        // alt="" because the dish name is the heading right beside it —
        // announcing it twice is noise.
        <RemoteImage
          src={item.imageUrl}
          srcSet={item.imageSrcSet}
          width={item.imageWidth}
          height={item.imageHeight}
          ratio={ratio}
          sizes={sizes}
          alt=""
          fallback={plate}
        />
      ) : (
        plate
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
