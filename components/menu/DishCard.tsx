'use client';

import type { MenuItem } from '@/lib/api/menu';
import { AllergenMarks, DietBadge, DishMedia, NutritionLine } from './DishParts';

/**
 * One dish on the menu page.
 *
 * The whole card is clickable, but the only interactive element is the button
 * inside the heading — its ::after is stretched over the card. That keeps one
 * tab stop per dish with the dish name as its accessible name, instead of an
 * <article> wrapped in a button that a screen reader reads as one long label.
 */
export function DishCard({ item, onOpen }: { item: MenuItem; onOpen: (item: MenuItem) => void }) {
  return (
    <article className="bobr-dish bobr-card">
      <div className="bobr-card__media bobr-dish__media">
        <DishMedia item={item} />
      </div>
      {/* Outside the media frame: everything inside it zooms on hover, and a
          label that grows with the photo reads as part of the picture. */}
      {item.diet && (
        <span className="bobr-dish__badge">
          <DietBadge diet={item.diet} />
        </span>
      )}

      <div className="bobr-dish__body">
        <h3 className="bobr-dish__name">
          <button type="button" className="bobr-dish__open" onClick={() => onOpen(item)}>
            {item.name}
          </button>
        </h3>
        {item.description && <p className="bobr-dish__desc">{item.description}</p>}

        <div className="bobr-dish__foot">
          <NutritionLine item={item} />
          <AllergenMarks item={item} />
        </div>
      </div>
    </article>
  );
}
