'use client';

import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';

import type { MenuItem } from '@/lib/api/menu';
import { getLenis } from '@/components/motion/SmoothScroll';
import { DietBadge, DishMedia } from './DishParts';
import { CloseIcon } from './MenuIcons';

/**
 * A dish up close: the full description, the nutrition as a small table, every
 * allergen spelled out and the tags.
 *
 * A native <dialog> opened with showModal(): the browser supplies the focus
 * trap, Escape, the inert page behind it and the top layer, all of which a
 * hand-rolled modal gets subtly wrong. Focus returns to the card's button on
 * close because the browser restores it to whatever opened the dialog.
 */
export function DishDialog({ item, onClose }: { item: MenuItem | null; onClose: () => void }) {
  const t = useTranslations('menu');
  const ref = useRef<HTMLDialogElement | null>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (item && !dialog.open) dialog.showModal();
    if (!item && dialog.open) dialog.close();
  }, [item]);

  useEffect(() => {
    if (!item) return;
    // Lenis keeps driving the page underneath a modal unless it is told not to.
    const lenis = getLenis();
    lenis?.stop();
    return () => lenis?.start();
  }, [item]);

  const nutrition = item
    ? [
        { label: t('energy'), value: item.kcal, unit: t('unitKcal') },
        { label: t('protein'), value: item.proteinG, unit: t('unitGram') },
        { label: t('fat'), value: item.fatG, unit: t('unitGram') },
        { label: t('carbs'), value: item.carbsG, unit: t('unitGram') },
      ].filter((row) => row.value !== null)
    : [];

  return (
    <dialog
      ref={ref}
      className="bobr-dish-dialog"
      aria-labelledby="bobr-dish-dialog-title"
      onClose={onClose}
      // A click on the backdrop lands on the dialog element itself.
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {item && (
        <div className="bobr-dish-dialog__inner" data-lenis-prevent>
          <button
            type="button"
            className="bobr-dish-dialog__close"
            onClick={onClose}
            aria-label={t('close')}
          >
            <CloseIcon />
          </button>

          <div className="bobr-dish-dialog__media">
            <DishMedia item={item} ratio="16 / 10" />
          </div>

          <div className="bobr-dish-dialog__body">
            <p className="bobr-kicker">
              {t(`course.${item.course}`)}
              {item.diet && (
                <>
                  <span aria-hidden> · </span>
                  <DietBadge diet={item.diet} />
                </>
              )}
            </p>
            <h2 id="bobr-dish-dialog-title" className="bobr-h3">
              {item.name}
            </h2>
            {item.description && <p className="bobr-dish-dialog__desc">{item.description}</p>}

            {nutrition.length > 0 && (
              <div>
                <h3 className="bobr-dish-dialog__label">
                  {t('nutrition')} <span className="bobr-dish-dialog__per">{t('perServing')}</span>
                </h3>
                <dl className="bobr-nutrition-table">
                  {nutrition.map((row) => (
                    <div key={row.label}>
                      <dt>{row.label}</dt>
                      <dd>
                        {row.value}
                        <span> {row.unit}</span>
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}

            <div>
              <h3 className="bobr-dish-dialog__label">{t('allergens')}</h3>
              {item.allergens.length > 0 ? (
                <ul className="bobr-allergen-marks bobr-allergen-marks--list">
                  {item.allergens.map((a) => (
                    <li key={a} className="bobr-allergen-mark">
                      {t(`allergen.${a}`)}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="bobr-dish-dialog__muted">{t('allergensNone')}</p>
              )}
            </div>

            {item.tags.length > 0 && (
              <div>
                <h3 className="bobr-dish-dialog__label">{t('tags')}</h3>
                <ul className="bobr-tags">
                  {item.tags.map((tag) => (
                    <li key={tag}>#{tag}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </dialog>
  );
}
