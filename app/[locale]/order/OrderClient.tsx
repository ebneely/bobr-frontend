'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';

import { Button } from '@/components/ui/Button';
import { apiFetch, ApiError, formatApiError } from '@/lib/api/client';
import { apiPlaceOrder, formatGrosze, type Order, type OrderMode } from '@/lib/api/orders';
import { apiGetShipping } from '@/lib/api/settings';
import { DASHBOARD_URL } from '@/lib/auth/urls';
import {
  formatDayLabel,
  formatMonthLabel,
  groupByMonth,
  offeredDeliveryDays,
} from '@/lib/dates';

interface Meal {
  id: string;
  type: string;
  namePl: string;
  nameEn: string;
  priceGrosze: number;
  imageUrl: string | null;
}

/** Matches the server. Duplicated deliberately — see the note on the total. */
const MIN_CALENDAR_DAYS = 5;

export function OrderClient() {
  const t = useTranslations('order');
  const locale = useLocale();

  const [meals, setMeals] = useState<Meal[]>([]);
  const [mealId, setMealId] = useState<string | null>(null);
  const [mode, setMode] = useState<OrderMode>('CALENDAR');
  const [days, setDays] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [placed, setPlaced] = useState<Order | null>(null);
  const [busy, setBusy] = useState(false);
  /** One-time shipping in grosze, from the admin setting. Null until loaded. */
  const [shipping, setShipping] = useState<number | null>(null);
  const [shippingFailed, setShippingFailed] = useState(false);

  useEffect(() => {
    apiGetShipping()
      .then((s) => setShipping(s.oneTimeShippingGrosze))
      .catch(() => setShippingFailed(true));
  }, []);

  useEffect(() => {
    apiFetch<Meal[]>('/meals', { auth: false })
      .then((list) => {
        setMeals(list);
        setMealId((current) => current ?? list[0]?.id ?? null);
      })
      .catch(() => setError(t('errorGeneric')));
  }, [t]);

  /**
   * The days on offer: Warsaw today + lead time, through the end of the
   * following calendar month, so any whole month can be picked in full.
   * Counted in Europe/Warsaw by `lib/dates` — never the browser's zone.
   */
  const offered = useMemo(
    () =>
      groupByMonth(offeredDeliveryDays()).map((group) => ({
        month: group.month,
        label: formatMonthLabel(group.month, locale),
        days: group.days.map((iso) => ({ iso, label: formatDayLabel(iso, locale) })),
      })),
    [locale],
  );

  // Every card gets a frame as soon as ANY meal has a photo, so a catalogue
  // that is only half photographed does not render as a row of cards at two
  // different heights. Derived during render rather than mirrored into
  // state, which is a copy that can disagree with what it came from.
  const anyPhoto = meals.some((m) => m.imageUrl);

  const tooFewDays = mode === 'CALENDAR' && days.size < MIN_CALENDAR_DAYS;
  const canPlace = Boolean(mealId) && days.size > 0 && !tooFewDays && !busy;

  /** Selects every offered day of a month, or clears them if all are selected. */
  function toggleMonth(isos: string[]) {
    setDays((previous) => {
      const next = new Set(previous);
      const allOn = isos.every((iso) => next.has(iso));
      for (const iso of isos) {
        if (allOn) next.delete(iso);
        else next.add(iso);
      }
      return next;
    });
  }

  function toggleDay(iso: string) {
    setDays((previous) => {
      const next = new Set(previous);
      if (next.has(iso)) next.delete(iso);
      else next.add(iso);
      return next;
    });
  }

  async function place() {
    if (!mealId) return;
    setError(null);
    setBusy(true);

    try {
      const order = await apiPlaceOrder({
        mealId,
        mode,
        // Sorted so the server receives them in the order they will be
        // delivered; it sorts too, but sending noise makes debugging harder.
        days: [...days].sort(),
      });
      setPlaced(order);
    } catch (e) {
      // 403 here means the intake gate refused — the most likely failure, and
      // the one with an action attached, so it gets its own message.
      const message =
        e instanceof ApiError && e.status === 403
          ? t('needProfile')
          : (formatApiError(e instanceof ApiError ? e.body : null) ||
            t('errorGeneric'));
      setError(message);
    } finally {
      setBusy(false);
    }
  }

  if (placed) {
    return (
      <section
        style={{
          background: 'var(--bobr-surface)',
          border: '1px solid var(--bobr-border)',
          borderRadius: 'var(--bobr-radius)',
          padding: '2rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          alignItems: 'flex-start',
        }}
      >
        <h2 className="bobr-h3">{t('successTitle')}</h2>
        <p
          style={{
            fontSize: 'var(--bobr-text-h3)',
            fontWeight: 'var(--bobr-weight-bold)',
            color: 'var(--bobr-accent)',
          }}
        >
          {formatGrosze(placed.totalGrosze, locale)}
        </p>
        {/* Figures as the server priced them — nothing recomputed here. */}
        <p
          className="bobr-body"
          data-testid="order-breakdown"
          style={{ fontSize: 'var(--bobr-text-sm)' }}
        >
          {t('successBreakdown', {
            days: placed.days.length,
            percent: placed.discountPercent,
            discount: formatGrosze(placed.discountGrosze, locale),
            shipping: formatGrosze(placed.shippingGrosze, locale),
          })}
        </p>
        <p className="bobr-body">{t('successBody')}</p>
        <a href={DASHBOARD_URL} style={{ textDecoration: 'none' }}>
          <Button>{t('goDashboard')}</Button>
        </a>
      </section>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
      <fieldset style={{ border: 0, margin: 0, padding: 0 }}>
        <legend className="bobr-h4" style={{ marginBottom: '0.875rem' }}>
          {t('pickMeal')}
        </legend>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 14rem), 1fr))',
            gap: '0.75rem',
          }}
        >
          {meals.map((meal) => (
            <Choice
              key={meal.id}
              name="meal"
              checked={mealId === meal.id}
              onSelect={() => setMealId(meal.id)}
              title={locale === 'pl' ? meal.namePl : meal.nameEn}
              note={formatGrosze(meal.priceGrosze, locale)}
              imageUrl={meal.imageUrl}
              showFrame={anyPhoto}
            />
          ))}
        </div>
      </fieldset>

      <fieldset style={{ border: 0, margin: 0, padding: 0 }}>
        <legend className="bobr-h4" style={{ marginBottom: '0.875rem' }}>
          {t('pickMode')}
        </legend>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 14rem), 1fr))',
            gap: '0.75rem',
          }}
        >
          <Choice
            name="mode"
            checked={mode === 'CALENDAR'}
            onSelect={() => setMode('CALENDAR')}
            title={t('calendar')}
            note={t('calendarNote')}
          />
          <Choice
            name="mode"
            checked={mode === 'ONE_TIME'}
            onSelect={() => setMode('ONE_TIME')}
            title={t('oneTime')}
            note={t('oneTimeNote')}
          />
        </div>
        {mode === 'CALENDAR' ? (
          <>
            <p
              className="bobr-body"
              style={{ fontSize: 'var(--bobr-text-sm)', marginTop: '0.75rem' }}
            >
              {t('shippingFree')}
            </p>
            <p
              className="bobr-body"
              style={{ fontSize: 'var(--bobr-text-sm)', marginTop: '0.25rem' }}
            >
              {t('ladder')}
            </p>
          </>
        ) : (
          <p
            className="bobr-body"
            data-testid="one-time-shipping"
            style={{ fontSize: 'var(--bobr-text-sm)', marginTop: '0.75rem' }}
          >
            {shipping !== null
              ? t('shippingOneTime', { amount: formatGrosze(shipping, locale) })
              : shippingFailed
                ? t('shippingUnknown')
                : t('shippingLoading')}
          </p>
        )}
      </fieldset>

      <fieldset style={{ border: 0, margin: 0, padding: 0 }}>
        <legend className="bobr-h4" style={{ marginBottom: '0.5rem' }}>
          {t('pickDays')}
        </legend>
        <p
          className="bobr-body"
          style={{ fontSize: 'var(--bobr-text-sm)', marginBottom: '0.875rem' }}
        >
          {t('leadTime')}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {offered.map((group) => {
            const isos = group.days.map((d) => d.iso);
            const allOn = isos.every((iso) => days.has(iso));
            return (
              <div
                key={group.month}
                data-month={group.month}
                style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}
              >
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'baseline',
                    justifyContent: 'space-between',
                    gap: '0.25rem 1rem',
                  }}
                >
                  <h3
                    className="bobr-body"
                    style={{
                      fontWeight: 'var(--bobr-weight-semibold)',
                      color: 'var(--bobr-fg)',
                      textTransform: 'capitalize',
                    }}
                  >
                    {group.label}
                  </h3>
                  {/* A button, not a checkbox: the day cells are the only
                      checkboxes in this grid, and scripts count on that. */}
                  <button
                    type="button"
                    className="bobr-navlink"
                    data-select-month={group.month}
                    onClick={() => toggleMonth(isos)}
                    style={{
                      background: 'none',
                      border: 0,
                      padding: 0,
                      font: 'inherit',
                      fontSize: 'var(--bobr-text-sm)',
                      cursor: 'pointer',
                    }}
                  >
                    {allOn ? t('clearMonth') : t('selectMonth', { count: isos.length })}
                  </button>
                </div>
                <div
                  style={{
                    display: 'grid',
                    // 6.5rem was narrower than a Polish day label ("niedz., 20 wrz"),
                    // so every cell wrapped to two lines and the rows went ragged.
                    // The track is now wide enough for the longest label the pl-PL
                    // formatter produces, and `min(100%, …)` keeps the grid from
                    // overflowing a 390px viewport, where it simply drops to one
                    // column instead of forcing a horizontal scrollbar.
                    gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 9rem), 1fr))',
                    gap: '0.5rem',
                  }}
                >
                  {group.days.map((day) => {
                  const on = days.has(day.iso);
                  return (
                    <label
                      key={day.iso}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '0.6rem 0.4rem',
                        cursor: 'pointer',
                        fontSize: 'var(--bobr-text-sm)',
                        textAlign: 'center',
                        // One line, always. Belt to the widened track's braces: if a
                        // locale ever produces a longer label than we sized for, the
                        // cell clips rather than silently growing taller than its
                        // neighbours and re-ragging the whole grid.
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        borderRadius: 'var(--bobr-radius-control)',
                        border: `1px solid ${on ? 'transparent' : 'var(--bobr-border)'}`,
                        background: on ? 'var(--bobr-fg)' : 'var(--bobr-surface)',
                        color: on ? 'var(--bobr-on-dark)' : 'var(--bobr-fg)',
                        transition: 'background var(--bobr-duration) var(--bobr-ease)',
                      }}
                    >
                      {/* A real checkbox, visually hidden rather than display:none —
                          display:none removes it from the tab order and from the
                          accessibility tree, so the grid would be unusable by
                          keyboard and silent to a screen reader. */}
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() => toggleDay(day.iso)}
                        style={{
                          position: 'absolute',
                          width: 1,
                          height: 1,
                          opacity: 0,
                          pointerEvents: 'none',
                        }}
                      />
                      {day.label}
                    </label>
                  );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <p
          className="bobr-body"
          style={{ fontSize: 'var(--bobr-text-sm)', marginTop: '0.875rem' }}
        >
          {t('selected', { count: days.size })}
          {tooFewDays && ` — ${t('minDays')}`}
        </p>
      </fieldset>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
        {/*
          No running total. The server prices the order, and reproducing the
          ladder here would be a second copy of a money rule that could drift
          from the real one — a total that is merely plausible is worse than no
          total, because nobody checks a number that looks right.
        */}
        <p
          className="bobr-body"
          style={{ fontSize: 'var(--bobr-text-sm)' }}
        >
          {t('totalNote')}
        </p>

        <p
          role="status"
          aria-live="polite"
          style={{
            minHeight: '1.2em',
            fontSize: 'var(--bobr-text-sm)',
            color: 'var(--bobr-danger)',
          }}
        >
          {error}
        </p>

        <div>
          <Button onClick={place} type="button">
            {busy ? t('placing') : t('place')}
          </Button>
        </div>
        {!canPlace && !busy && (
          <span
            style={{
              fontSize: 'var(--bobr-text-xs)',
              color: 'var(--bobr-fg-muted)',
            }}
          >
            {tooFewDays ? t('minDays') : t('pickDays')}
          </span>
        )}
      </div>
    </div>
  );
}

function Choice({
  name,
  checked,
  onSelect,
  title,
  note,
  imageUrl,
  showFrame = false,
}: {
  name: string;
  checked: boolean;
  onSelect: () => void;
  title: string;
  note: string;
  imageUrl?: string | null;
  showFrame?: boolean;
}) {
  return (
    <label
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.25rem',
        padding: '1rem',
        cursor: 'pointer',
        borderRadius: 'var(--bobr-radius)',
        border: `1px solid ${checked ? 'var(--bobr-accent)' : 'var(--bobr-border)'}`,
        background: 'var(--bobr-surface)',
        boxShadow: checked ? 'var(--bobr-shadow-sm)' : 'none',
      }}
    >
      <input
        type="radio"
        name={name}
        checked={checked}
        onChange={onSelect}
        style={{
          position: 'absolute',
          width: 1,
          height: 1,
          opacity: 0,
          pointerEvents: 'none',
        }}
      />
      {showFrame && (
        <div
          style={{
            aspectRatio: '4 / 3',
            // Without this the frame can outgrow a narrow column and push the
            // whole grid into a horizontal scroll at 390px.
            maxWidth: '100%',
            marginBottom: '0.5rem',
            borderRadius: 'var(--bobr-radius-sm)',
            overflow: 'hidden',
            background: 'var(--bobr-bg-alt)',
          }}
        >
          {imageUrl && (
            // A plain <img>, not next/image: the photo is served by the API on
            // another origin, which next/image would need told about in
            // remotePatterns, and it needs no optimising — the API stores webp
            // already. alt="" because the name sits directly underneath, so
            // announcing it twice is noise.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt=""
              loading="lazy"
              decoding="async"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
              }}
            />
          )}
        </div>
      )}
      <span style={{ fontWeight: 'var(--bobr-weight-semibold)' }}>{title}</span>
      <span
        style={{
          fontSize: 'var(--bobr-text-sm)',
          color: 'var(--bobr-fg-muted)',
        }}
      >
        {note}
      </span>
    </label>
  );
}
