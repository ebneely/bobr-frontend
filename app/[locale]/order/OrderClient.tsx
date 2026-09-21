'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';

import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { GateCard } from '@/components/ui/GateCard';
import { ApiError, formatApiError } from '@/lib/api/client';
import { useApiErrorTranslate } from '@/lib/api/use-api-error';
import { apiQuoteZone, type ZoneQuote } from '@/lib/api/delivery-zones';
import { mealName, type Meal } from '@/lib/api/meals';
import { RemoteImage } from '@/components/ui/RemoteImage';
import {
  formatGrosze,
  type OrderDelivery,
  type OrderMode,
  type PlaceOrderInput,
  type PlacedOrder,
} from '@/lib/api/orders';
import {
  formatDayLabel,
  formatMonthLabel,
  groupByMonth,
  isDeliveryDay,
  offeredDeliveryDays,
  todayInWarsaw,
} from '@/lib/dates';
import {
  ADDRESS_LINE_MAX,
  CITY_MAX,
  formatPostalCodeInput,
  isCompletePostalCode,
  validateAddress,
  type AddressField,
} from '@/lib/delivery';
import { useMe } from '@/lib/hooks/use-account';
import { useMeals, useOrderQuote, usePlaceOrder } from '@/lib/hooks/use-order';
import { useClosedDays, usePublicSettings } from '@/lib/hooks/use-settings';
import {
  breakdownOf,
  buildQuoteRequest,
  canPlaceOrder,
  classifyQuoteError,
  summaryState,
  type Breakdown,
  type SummaryState,
} from '@/lib/order-quote';

/**
 * What the zone lookup said about the postal code as typed. `idle` until the
 * code is complete. This answers "do you deliver here?" from the postal code
 * alone, before the rest of the address is filled in; the order quote then
 * prices the whole order.
 */
type ZoneCheck =
  | { state: 'idle' }
  | { state: 'loading'; postalCode: string }
  | { state: 'ok'; postalCode: string; zone: ZoneQuote }
  | { state: 'notDelivered'; postalCode: string }
  | { state: 'invalid'; postalCode: string }
  | { state: 'failed'; postalCode: string };

/** How long typing must pause before the zone is looked up. */
const ZONE_DEBOUNCE_MS = 350;

export function OrderClient({
  signedIn,
  initialMealId,
  returnPath,
}: {
  /** From the server's session check. A 401 from the API later flips it. */
  signedIn: boolean;
  /** `?meal=` — preselected when it is an active meal. */
  initialMealId: string | null;
  /** This page with its query, for the login and intake links' `next`. */
  returnPath: string;
}) {
  const t = useTranslations('order');
  const translateError = useApiErrorTranslate();
  const locale = useLocale();

  const meals = useMeals();
  const mealList = useMemo(() => meals.data ?? [], [meals.data]);
  // The calendar and order rules are the admin's (`/v1/settings/public`);
  // nothing is offered until they have arrived rather than guessing them.
  const settings = usePublicSettings().data ?? null;
  const closedDays = useClosedDays(todayInWarsaw()).data;

  // null = not chosen by hand yet: the `?meal=` one when it is on offer,
  // otherwise the first. Derived, so it follows the list when it arrives.
  const [pickedMealId, setPickedMealId] = useState<string | null>(null);
  const mealId =
    pickedMealId ??
    mealList.find((m) => m.id === initialMealId)?.id ??
    mealList[0]?.id ??
    null;
  const meal = mealList.find((m) => m.id === mealId) ?? null;

  const [mode, setMode] = useState<OrderMode>('CALENDAR');
  const [days, setDays] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [placed, setPlaced] = useState<PlacedOrder | null>(null);
  const [addressLine, setAddressLine] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  // `null` means "not edited in this browser yet" — falls back to the
  // profile's own phone (once it loads) on every render, with no effect
  // needed to seed it.
  const [contactPhoneEdit, setContactPhoneEdit] = useState<string | null>(null);
  const [deliveryNotes, setDeliveryNotes] = useState('');
  /** Field errors are shown only after an attempt to place, not while typing. */
  const [showAddressErrors, setShowAddressErrors] = useState(false);
  const [zoneCheck, setZoneCheck] = useState<ZoneCheck>({ state: 'idle' });
  /** The API said 401 after the page rendered signed in (an expired session). */
  const [authLost, setAuthLost] = useState(false);
  /** The API refused placing for the intake gate. */
  const [intakeRefused, setIntakeRefused] = useState(false);

  const place = usePlaceOrder();

  // G14 — prefill the contact phone from the profile, so a customer who
  // already gave a number does not have to retype it. Editing afterwards wins.
  const me = useMe(signedIn);
  const contactPhone = contactPhoneEdit ?? me.data?.phone ?? '';

  // G38 — one id for the lifetime of this page. A double click on "place" or a
  // retry after a timeout resends the SAME id, so the server answers with the
  // order it already created instead of a second one.
  const clientRequestId = useMemo(() => crypto.randomUUID(), []);

  // Ask which zone a complete postal code falls in. Debounced, and a newer
  // code aborts the older request so a slow answer cannot overwrite a fresh one.
  useEffect(() => {
    if (!isCompletePostalCode(postalCode)) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setZoneCheck({ state: 'loading', postalCode });
      apiQuoteZone(postalCode, controller.signal)
        .then((zone) => setZoneCheck({ state: 'ok', postalCode, zone }))
        .catch((e: unknown) => {
          if (controller.signal.aborted) return;
          if (e instanceof ApiError && e.status === 404) {
            setZoneCheck({ state: 'notDelivered', postalCode });
          } else if (e instanceof ApiError && e.status === 422) {
            setZoneCheck({ state: 'invalid', postalCode });
          } else {
            setZoneCheck({ state: 'failed', postalCode });
          }
        });
    }, ZONE_DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [postalCode]);

  // A zone answer only counts for the code it was asked about.
  const zone: ZoneCheck =
    zoneCheck.state !== 'idle' && zoneCheck.postalCode === postalCode
      ? zoneCheck
      : { state: 'idle' };

  /**
   * The days on offer: Warsaw today + the admin's lead time (and cut-off hour),
   * through the end of the order window. Days the kitchen does not deliver
   * (weekday off, closed day) stay in the grid so it keeps its shape, but
   * cannot be picked. Counted in Europe/Warsaw by `lib/dates`.
   */
  const offered = useMemo(() => {
    if (!settings || !closedDays) return [];
    return groupByMonth(offeredDeliveryDays(settings)).map((group) => ({
      month: group.month,
      label: formatMonthLabel(group.month, locale),
      days: group.days.map((iso) => ({
        iso,
        label: formatDayLabel(iso, locale),
        open: isDeliveryDay(iso, settings, closedDays),
      })),
    }));
  }, [locale, settings, closedDays]);

  // Every card gets a frame as soon as ANY meal has a photo, so a catalogue
  // that is only half photographed does not render cards at two heights.
  const anyPhoto = mealList.some((m) => m.imageUrl);
  // The meal grid is auto-fit 14rem columns in a 52rem page: at most three.
  const mealImageSizes = `(max-width: 30rem) 100vw, ${Math.ceil(52 / Math.min(Math.max(mealList.length, 1), 3))}rem`;

  const request = settings
    ? buildQuoteRequest({
        mealId,
        mode,
        days,
        addressLine,
        city,
        postalCode,
        rules: settings,
      })
    : ({ ready: false, missing: 'days' } as const);
  const quoteQuery = useOrderQuote(signedIn && !authLost ? request : { ready: false, missing: 'meal' });
  const summary: SummaryState = summaryState(request, quoteQuery);

  const addressErrors = validateAddress({ addressLine, city, postalCode });
  const notDelivered =
    zone.state === 'notDelivered' ||
    (summary.state === 'refused' && summary.refusal.kind === 'notDelivered');
  const quoteSignedOut = summary.state === 'refused' && summary.refusal.kind === 'signedOut';
  const needsIntake =
    intakeRefused || (summary.state === 'refused' && summary.refusal.kind === 'intake');
  const ready = canPlaceOrder(summary) && !place.isPending && !needsIntake;

  /**
   * An address message under the button goes stale the moment the address is
   * edited, so editing clears it; field errors re-derive on their own.
   */
  function clearAddressError() {
    setError((current) =>
      current === t('addressIncomplete') || current === t('zoneNotDelivered') ? null : current,
    );
  }

  function addressError(field: AddressField): string | undefined {
    if (field === 'postalCode') {
      if (notDelivered && isCompletePostalCode(postalCode)) return t('zoneNotDelivered');
      if (zone.state === 'invalid') return t('postalCodeFormat');
    }
    if (!showAddressErrors) return undefined;
    const problem = addressErrors[field];
    if (!problem) return undefined;
    if (field === 'postalCode') {
      return problem === 'required' ? t('postalCodeRequired') : t('postalCodeFormat');
    }
    if (field === 'city') {
      return problem === 'tooLong' ? t('cityTooLong', { max: CITY_MAX }) : t('cityRequired');
    }
    return problem === 'tooLong'
      ? t('addressLineTooLong', { max: ADDRESS_LINE_MAX })
      : t('addressLineRequired');
  }

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
      // A one-time order has the admin's fixed day count: with one day,
      // picking replaces the selection; with more, extra picks are ignored.
      if (mode === 'ONE_TIME') {
        const limit = settings?.oneTimeDayCount ?? 1;
        if (previous.has(iso)) {
          const next = new Set(previous);
          next.delete(iso);
          return next;
        }
        if (limit === 1) return new Set([iso]);
        return previous.size < limit ? new Set([...previous, iso]) : previous;
      }
      const next = new Set(previous);
      if (next.has(iso)) next.delete(iso);
      else next.add(iso);
      return next;
    });
  }

  async function submit() {
    setError(null);
    if (!request.ready) {
      if (request.missing === 'address') {
        setShowAddressErrors(true);
        setError(t('addressIncomplete'));
      }
      return;
    }
    if (notDelivered) {
      setError(t('zoneNotDelivered'));
      return;
    }
    // The customer agrees to the total on screen, so only a total that answers
    // this exact selection lets the order through.
    if (!ready || summary.state !== 'ready') return;

    try {
      // The body that was quoted, not a fresh copy of the form: the figures
      // above the button are for exactly this. Phone/notes/clientRequestId
      // ride along too — none of them are priced, so they never touched the
      // quote.
      const input: PlaceOrderInput = {
        ...request.input,
        contactPhone: contactPhone.trim() || undefined,
        deliveryNotes: deliveryNotes.trim() || undefined,
        clientRequestId,
      };
      const order = await place.mutateAsync(input);
      setPlaced(order);
    } catch (e) {
      const refusal = classifyQuoteError(e);
      if (refusal.kind === 'signedOut') setAuthLost(true);
      else if (refusal.kind === 'intake') setIntakeRefused(true);
      else if (refusal.kind === 'notDelivered') {
        setZoneCheck({ state: 'notDelivered', postalCode });
        setError(t('zoneNotDelivered'));
      } else {
        setError(formatApiError(refusal.body, translateError) || t('errorGeneric'));
      }
    }
  }

  const loginHref = { pathname: '/login', query: { next: returnPath } } as const;
  const intakeHref = { pathname: '/intake', query: { next: returnPath } } as const;

  // Signed out: say why and offer the way in. The form state lives above this
  // branch, so it is kept if the session comes back without a reload.
  if (!signedIn || authLost || quoteSignedOut) {
    return (
      <GateCard
        testId="order-signed-out"
        title={t('signInTitle')}
        body={t('signInBody')}
        cta={t('signIn')}
        href={loginHref}
      />
    );
  }

  if (placed) {
    const address = placed.delivery;
    return (
      <section
        data-testid="order-placed"
        style={{
          background: 'var(--bobr-surface)',
          border: '1px solid var(--bobr-border)',
          borderRadius: 'var(--bobr-radius)',
          padding: 'clamp(1.25rem, 4vw, 2rem)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
          alignItems: 'stretch',
        }}
      >
        <h2 className="bobr-h3">{t('successTitle')}</h2>
        {/* Figures as the server froze them on the order — nothing recomputed. */}
        <BreakdownList
          testId="order-breakdown"
          breakdown={breakdownOf(placed)}
          mealLabel={placed.meal ? mealName(placed.meal, locale) : meal ? mealName(meal, locale) : null}
          firstDay={placed.firstDeliveryDay}
          lastDay={placed.lastDeliveryDay}
          delivery={address}
          // The success text below already says how payment works.
          paymentNote={false}
        />
        <p className="bobr-body">{t('successBody')}</p>
        <div>
          <Button href={`/account/orders/${placed.id}`}>{t('successCta')}</Button>
        </div>
      </section>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
      <fieldset style={{ border: 0, margin: 0, padding: 0 }}>
        <legend className="bobr-h4" style={{ marginBottom: '0.875rem' }}>
          {t('pickMeal')}
        </legend>
        {meals.isError && (
          <p role="alert" style={{ color: 'var(--bobr-danger)', fontSize: 'var(--bobr-text-sm)' }}>
            {t('mealsFailed')}
          </p>
        )}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 14rem), 1fr))',
            gap: '0.75rem',
          }}
        >
          {mealList.map((m) => (
            <Choice
              key={m.id}
              name="meal"
              value={m.id}
              checked={mealId === m.id}
              onSelect={() => setPickedMealId(m.id)}
              title={mealName(m, locale)}
              note={t('perDay', { price: formatGrosze(m.priceGrosze, locale) })}
              image={m}
              imageSizes={mealImageSizes}
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
            value="CALENDAR"
            checked={mode === 'CALENDAR'}
            onSelect={() => setMode('CALENDAR')}
            title={t('calendar')}
            note={
              settings
                ? t('calendarNote', {
                    free: settings.calendarFreeShipping ? 'yes' : 'no',
                    minDays: settings.calendarMinDays,
                  })
                : ''
            }
          />
          <Choice
            name="mode"
            value="ONE_TIME"
            checked={mode === 'ONE_TIME'}
            onSelect={() => {
              setMode('ONE_TIME');
              // Keep only the earliest chosen days, up to the one-time count.
              setDays(
                (previous) =>
                  new Set([...previous].sort().slice(0, settings?.oneTimeDayCount ?? 1)),
              );
            }}
            title={t('oneTime')}
            note={settings ? t('oneTimeNote', { count: settings.oneTimeDayCount }) : ''}
          />
        </div>
        {mode === 'CALENDAR' && settings ? (
          <>
            <p className="bobr-body" style={{ fontSize: 'var(--bobr-text-sm)', marginTop: '0.75rem' }}>
              {settings.calendarFreeShipping ? t('shippingFree') : t('shippingByZone')}
            </p>
            {(settings.discountTiers.length > 0 || settings.wholeMonthPercent > 0) && (
              <p className="bobr-body" style={{ fontSize: 'var(--bobr-text-sm)', marginTop: '0.25rem' }}>
                {[
                  t('ladder'),
                  [
                    ...settings.discountTiers.map((tier) =>
                      t('ladderTier', { days: tier.minDays, percent: tier.percent }),
                    ),
                    ...(settings.wholeMonthPercent > 0
                      ? [t('ladderMonth', { percent: settings.wholeMonthPercent })]
                      : []),
                  ].join(' · '),
                ].join(' ')}
              </p>
            )}
          </>
        ) : (
          <p className="bobr-body" style={{ fontSize: 'var(--bobr-text-sm)', marginTop: '0.75rem' }}>
            {t('shippingByZone')}
          </p>
        )}
      </fieldset>

      <fieldset style={{ border: 0, margin: 0, padding: 0 }}>
        <legend className="bobr-h4" style={{ marginBottom: '0.5rem' }}>
          {t('pickDays')}
        </legend>
        <p className="bobr-body" style={{ fontSize: 'var(--bobr-text-sm)', marginBottom: '0.875rem' }}>
          {offered.length > 0 &&
            t('leadTime', {
              earliest: offered[0].days[0].label,
              latest: offered[offered.length - 1].days.at(-1)?.label ?? '',
            })}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {offered.map((group) => {
            const isos = group.days.filter((d) => d.open).map((d) => d.iso);
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
                      checkboxes in this grid, and scripts count on that.
                      Hidden for one-time orders, which have a single day. */}
                  {mode === 'CALENDAR' && (
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
                  )}
                </div>
                <div
                  style={{
                    display: 'grid',
                    // Wide enough for the longest pl-PL day label on one line;
                    // `min(100%, …)` drops to one column rather than overflow at 390px.
                    gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 9rem), 1fr))',
                    gap: '0.5rem',
                  }}
                >
                  {group.days.map((day) => {
                    const on = days.has(day.iso);
                    const closed = !day.open;
                    return (
                      <label
                        key={day.iso}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '0.6rem 0.4rem',
                          cursor: closed ? 'not-allowed' : 'pointer',
                          opacity: closed ? 0.45 : 1,
                          textDecoration: closed ? 'line-through' : undefined,
                          fontSize: 'var(--bobr-text-sm)',
                          textAlign: 'center',
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
                        {/* A real checkbox, visually hidden rather than
                            display:none, so it stays in the tab order and the
                            accessibility tree. */}
                        <input
                          type="checkbox"
                          checked={on}
                          disabled={closed}
                          aria-label={closed ? `${day.label} — ${t('dayClosed')}` : undefined}
                          value={day.iso}
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

        <p className="bobr-body" style={{ fontSize: 'var(--bobr-text-sm)', marginTop: '0.875rem' }}>
          {t('selected', { count: days.size })}
          {mode === 'CALENDAR' &&
            settings &&
            days.size < settings.calendarMinDays &&
            ` — ${t('minDays', { minDays: settings.calendarMinDays })}`}
        </p>
      </fieldset>

      <fieldset data-testid="delivery-address" style={{ border: 0, margin: 0, padding: 0, minWidth: 0 }}>
        <legend className="bobr-h4" style={{ marginBottom: '0.875rem' }}>
          {t('addressTitle')}
        </legend>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Field
            label={t('addressLine')}
            name="addressLine"
            autoComplete="address-line1"
            maxLength={ADDRESS_LINE_MAX}
            value={addressLine}
            onChange={(e) => {
              setAddressLine(e.target.value);
              clearAddressError();
            }}
            error={addressError('addressLine')}
          />
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 12rem), 1fr))',
              gap: '1rem',
            }}
          >
            <Field
              label={t('postalCode')}
              name="postalCode"
              autoComplete="postal-code"
              inputMode="numeric"
              placeholder="00-000"
              maxLength={6}
              value={postalCode}
              onChange={(e) => {
                setPostalCode(formatPostalCodeInput(e.target.value));
                clearAddressError();
              }}
              hint={t('postalCodeHint')}
              error={addressError('postalCode')}
            />
            <Field
              label={t('city')}
              name="city"
              autoComplete="address-level2"
              maxLength={CITY_MAX}
              value={city}
              onChange={(e) => {
                setCity(e.target.value);
                clearAddressError();
              }}
              error={addressError('city')}
            />
          </div>
          {/* Polite, but not role="status": the order's error line below is the
              first status region, and scripts read that one. */}
          <p
            aria-live="polite"
            data-testid="zone-quote"
            data-quote={zone.state}
            style={{
              minHeight: '1.2em',
              fontSize: 'var(--bobr-text-sm)',
              color: zone.state === 'notDelivered' ? 'var(--bobr-danger)' : 'var(--bobr-fg)',
            }}
          >
            {zone.state === 'loading' && t('zoneChecking')}
            {zone.state === 'failed' && t('zoneFailed')}
            {zone.state === 'ok' && (
              <>
                {t('zoneName', { zone: locale === 'pl' ? zone.zone.namePl : zone.zone.nameEn })}
                {' · '}
                {mode === 'ONE_TIME'
                  ? t('shippingOneTime', { amount: formatGrosze(zone.zone.oneTimeShippingGrosze, locale) })
                  : t('shippingFreeShort')}
              </>
            )}
          </p>
        </div>
      </fieldset>

      <fieldset data-testid="delivery-extras" style={{ border: 0, margin: 0, padding: 0, minWidth: 0 }}>
        <legend className="bobr-h4" style={{ marginBottom: '0.875rem' }}>
          {t('extrasTitle')}
        </legend>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Field
            label={`${t('contactPhone')} (${t('optionalField')})`}
            type="tel"
            name="contactPhone"
            autoComplete="tel"
            placeholder="+48 600 000 000"
            value={contactPhone}
            onChange={(e) => setContactPhoneEdit(e.target.value)}
            hint={t('contactPhoneHint')}
          />
          <Field
            label={`${t('deliveryNotes')} (${t('optionalField')})`}
            name="deliveryNotes"
            autoComplete="off"
            maxLength={300}
            value={deliveryNotes}
            onChange={(e) => setDeliveryNotes(e.target.value)}
            hint={t('deliveryNotesHint')}
          />
        </div>
      </fieldset>

      {/*
        The summary sits DIRECTLY above the button that commits the customer to
        pay, with the full total including delivery (Ustawa o prawach
        konsumenta, art. 17 — G03). Every figure is the server's quote for this
        exact selection; nothing is priced in the browser.
      */}
      <section
        data-testid="order-summary"
        data-summary={summary.state}
        data-fresh={summary.state === 'ready' ? String(summary.fresh) : undefined}
        aria-labelledby="order-summary-title"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          padding: 'clamp(1.25rem, 4vw, 2rem)',
          background: 'var(--bobr-surface)',
          border: '1px solid var(--bobr-border)',
          borderRadius: 'var(--bobr-radius)',
        }}
      >
        <h2 id="order-summary-title" className="bobr-h4">
          {t('summaryTitle')}
        </h2>

        <SummaryBody
          summary={summary}
          needsIntake={needsIntake}
          mealLabel={meal ? mealName(meal, locale) : null}
          intakeHref={intakeHref}
          notDelivered={notDelivered}
          minDays={settings?.calendarMinDays ?? 0}
        />

        <p
          role="status"
          aria-live="polite"
          style={{ minHeight: '1.2em', fontSize: 'var(--bobr-text-sm)', color: 'var(--bobr-danger)', whiteSpace: 'pre-line' }}
        >
          {error}
        </p>

        {/* A disabled fieldset disables the button inside it natively — the
            shared Button has no disabled prop, and this keeps it that way.
            Clickable while the address is incomplete, so a press shows which
            fields are missing. */}
        <fieldset
          disabled={!ready && !(summary.state === 'incomplete' && summary.missing === 'address')}
          style={{
            border: 0,
            margin: 0,
            padding: 0,
            minWidth: 0,
            opacity: ready ? 1 : 0.5,
          }}
        >
          <Button onClick={submit} type="button">
            {place.isPending ? t('placing') : t('place')}
          </Button>
        </fieldset>
        <p style={{ fontSize: 'var(--bobr-text-xs)', color: 'var(--bobr-fg-muted)' }}>{t('placeNote')}</p>
      </section>
    </div>
  );
}

function SummaryBody({
  summary,
  needsIntake,
  mealLabel,
  intakeHref,
  notDelivered,
  minDays,
}: {
  summary: SummaryState;
  needsIntake: boolean;
  mealLabel: string | null;
  intakeHref: { pathname: '/intake'; query: { next: string } };
  notDelivered: boolean;
  /** The admin's calendar minimum, for the "pick more days" hint. */
  minDays: number;
}) {
  const t = useTranslations('order');
  const translateError = useApiErrorTranslate();

  const hint = (text: string, tone: 'muted' | 'danger' = 'muted') => (
    <p
      data-testid="summary-hint"
      className="bobr-body"
      style={{
        fontSize: 'var(--bobr-text-sm)',
        color: tone === 'danger' ? 'var(--bobr-danger)' : 'var(--bobr-fg-muted)',
      }}
    >
      {text}
    </p>
  );

  if (needsIntake) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'flex-start' }}>
        {hint(t('needProfile'), 'danger')}
        <Button href={intakeHref} variant="outline">
          {t('goIntake')}
        </Button>
      </div>
    );
  }
  if (notDelivered) return hint(t('zoneNotDelivered'), 'danger');

  switch (summary.state) {
    case 'incomplete':
      return hint(
        t(`summaryMissing.${summary.missing}`, { minDays }),
      );
    case 'loading':
      return hint(t('summaryLoading'));
    case 'refused':
      return hint(
        formatApiError(summary.refusal.kind === 'other' ? summary.refusal.body : null, translateError) ||
          t('summaryFailed'),
        'danger',
      );
    case 'ready':
      return (
        <div
          aria-busy={!summary.fresh}
          style={{
            opacity: summary.fresh ? 1 : 0.55,
            transition: 'opacity var(--bobr-duration) var(--bobr-ease)',
          }}
        >
          <BreakdownList
            testId="summary-breakdown"
            breakdown={breakdownOf(summary.quote)}
            mealLabel={mealLabel}
            firstDay={summary.quote.firstDeliveryDay}
            lastDay={summary.quote.lastDeliveryDay}
            delivery={summary.quote.delivery}
          />
          {!summary.fresh && hint(t('summaryUpdating'))}
        </div>
      );
  }
}

/**
 * The money lines, the same for the live quote and the placed order, so what
 * the customer agreed to and what they got read identically.
 */
function BreakdownList({
  breakdown: b,
  mealLabel,
  firstDay,
  lastDay,
  delivery,
  testId,
  paymentNote = true,
}: {
  paymentNote?: boolean;
  breakdown: Breakdown;
  mealLabel: string | null;
  firstDay?: string;
  lastDay?: string;
  delivery: OrderDelivery | null;
  testId: string;
}) {
  const t = useTranslations('order');
  const locale = useLocale();
  const money = (grosze: number) => formatGrosze(grosze, locale);

  const rows: { key: string; label: string; value: string }[] = [];
  if (mealLabel) rows.push({ key: 'meal', label: t('summaryMeal'), value: mealLabel });
  if (firstDay && lastDay) {
    rows.push({
      key: 'days',
      label: t('summaryDays', { count: b.dayCount }),
      value:
        firstDay === lastDay
          ? formatDayLabel(firstDay, locale)
          : `${formatDayLabel(firstDay, locale)} – ${formatDayLabel(lastDay, locale)}`,
    });
  }
  rows.push({
    key: 'goods',
    label: t('summaryGoods', { price: money(b.unitPriceGrosze), count: b.dayCount }),
    value: money(b.goodsGrosze),
  });
  if (b.discountGrosze > 0) {
    rows.push({
      key: 'discount',
      label: t('summaryDiscount', { percent: b.discountPercent }),
      value: `−${money(b.discountGrosze)}`,
    });
  }
  rows.push({
    key: 'shipping',
    label: t('summaryShipping'),
    value: b.shippingGrosze === 0 ? t('summaryShippingFree') : money(b.shippingGrosze),
  });

  return (
    <div data-testid={testId} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
      <dl style={{ margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {rows.map((row) => (
          <div
            key={row.key}
            data-row={row.key}
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              gap: '0.125rem 1rem',
              fontSize: 'var(--bobr-text-sm)',
            }}
          >
            <dt style={{ color: 'var(--bobr-fg-muted)' }}>{row.label}</dt>
            <dd style={{ margin: 0, color: 'var(--bobr-fg)', fontWeight: 'var(--bobr-weight-medium)', textAlign: 'right' }}>
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
      {delivery && (
        <p
          data-testid={`${testId}-address`}
          style={{ fontSize: 'var(--bobr-text-sm)', color: 'var(--bobr-fg-muted)', overflowWrap: 'anywhere' }}
        >
          {t('summaryAddress', {
            address: `${delivery.addressLine}, ${delivery.postalCode} ${delivery.city}`,
            zone: (locale === 'pl' ? delivery.zoneNamePl : delivery.zoneNameEn) ?? '—',
          })}
        </p>
      )}
      <div
        data-row="total"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: '0.25rem 1rem',
          paddingTop: '0.875rem',
          borderTop: '1px solid var(--bobr-border)',
        }}
      >
        <span style={{ fontWeight: 'var(--bobr-weight-semibold)', color: 'var(--bobr-fg)' }}>
          {t('summaryTotal')}
        </span>
        <span
          data-testid={`${testId}-total`}
          style={{
            fontSize: 'var(--bobr-text-h3)',
            fontWeight: 'var(--bobr-weight-bold)',
            color: 'var(--bobr-accent)',
          }}
        >
          {money(b.totalGrosze)}
        </span>
      </div>
      {paymentNote && (
        <p style={{ fontSize: 'var(--bobr-text-xs)', color: 'var(--bobr-fg-muted)' }}>{t('summaryPayment')}</p>
      )}
    </div>
  );
}

function Choice({
  name,
  value,
  checked,
  onSelect,
  title,
  note,
  image,
  imageSizes = '100vw',
  showFrame = false,
}: {
  name: string;
  value: string;
  checked: boolean;
  onSelect: () => void;
  title: string;
  note: string;
  image?: Pick<Meal, 'imageUrl' | 'imageSrcSet' | 'imageWidth' | 'imageHeight'>;
  imageSizes?: string;
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
        value={value}
        checked={checked}
        onChange={onSelect}
        style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}
      />
      {showFrame && (
        <div
          style={{
            aspectRatio: '4 / 3',
            maxWidth: '100%',
            marginBottom: '0.5rem',
            borderRadius: 'var(--bobr-radius-sm)',
            overflow: 'hidden',
            background: 'var(--bobr-bg-alt)',
          }}
        >
          {image?.imageUrl && (
            // alt="" because the name sits directly below. The frame's 4 / 3
            // reserves the space; the photo is cropped into it.
            <RemoteImage
              src={image.imageUrl}
              srcSet={image.imageSrcSet}
              width={image.imageWidth}
              height={image.imageHeight}
              ratio="4 / 3"
              sizes={imageSizes}
              alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          )}
        </div>
      )}
      <span style={{ fontWeight: 'var(--bobr-weight-semibold)' }}>{title}</span>
      <span style={{ fontSize: 'var(--bobr-text-sm)', color: 'var(--bobr-fg-muted)' }}>{note}</span>
    </label>
  );
}
