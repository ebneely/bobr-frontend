import { ApiError, type ApiErrorBody } from '@/lib/api/client';
import type { OrderQuote } from '@/lib/api/orders';
import { parseMealParam } from '@/lib/api/meals';
import {
  breakdownOf,
  buildQuoteRequest,
  canPlaceOrder,
  classifyQuoteError,
  summaryState,
  type OrderDraft,
  type QuoteQueryView,
  type QuoteRequest,
} from '@/lib/order-quote';

const MEAL = '9133f6cc-54f5-4e68-a528-519007963cc3';
const FIVE = ['2026-09-21', '2026-09-18', '2026-09-17', '2026-09-19', '2026-09-20'];

function draft(partial: Partial<OrderDraft> = {}): OrderDraft {
  return {
    mealId: MEAL,
    mode: 'CALENDAR',
    days: FIVE,
    addressLine: '  ul. Marszałkowska 1 ',
    city: 'Warszawa ',
    postalCode: '00-950',
    ...partial,
  };
}

function quote(partial: Partial<OrderQuote> = {}): OrderQuote {
  return {
    mealId: MEAL,
    mode: 'CALENDAR',
    unitPriceGrosze: 4500,
    goodsGrosze: 22500,
    discountPercent: 0,
    discountGrosze: 0,
    shippingGrosze: 0,
    totalGrosze: 22500,
    dayCount: 5,
    deliveryDays: [...FIVE].sort(),
    firstDeliveryDay: '2026-09-17',
    lastDeliveryDay: '2026-09-21',
    delivery: {
      addressLine: 'ul. Marszałkowska 1',
      city: 'Warszawa',
      postalCode: '00-950',
      zoneId: 'z',
      zoneNamePl: 'Warszawa',
      zoneNameEn: 'Warsaw',
    },
    ...partial,
  };
}

function view(partial: Partial<QuoteQueryView> = {}): QuoteQueryView {
  return { key: null, data: undefined, error: null, isPlaceholderData: false, isFetching: false, ...partial };
}

function apiError(status: number, body: Partial<ApiErrorBody> = {}): ApiError {
  return new ApiError(status, { statusCode: status, message: 'x', error: 'x', ...body });
}

function ready(request: QuoteRequest): Extract<QuoteRequest, { ready: true }> {
  if (!request.ready) throw new Error(`not ready: ${request.missing}`);
  return request;
}

describe('buildQuoteRequest', () => {
  it('asks for things in page order: meal, days, calendar minimum, address', () => {
    expect(buildQuoteRequest(draft({ mealId: null }))).toEqual({ ready: false, missing: 'meal' });
    expect(buildQuoteRequest(draft({ days: [] }))).toEqual({ ready: false, missing: 'days' });
    expect(buildQuoteRequest(draft({ days: FIVE.slice(0, 4) }))).toEqual({
      ready: false,
      missing: 'minDays',
    });
    expect(buildQuoteRequest(draft({ city: '' }))).toEqual({ ready: false, missing: 'address' });
    expect(buildQuoteRequest(draft({ postalCode: '00-95' }))).toEqual({
      ready: false,
      missing: 'address',
    });
  });

  it('lets a one-time order through with a single day', () => {
    const r = ready(buildQuoteRequest(draft({ mode: 'ONE_TIME', days: ['2026-09-18'] })));
    expect(r.input.days).toEqual(['2026-09-18']);
    expect(r.input.mode).toBe('ONE_TIME');
  });

  it('sends sorted, de-duplicated days and a trimmed address', () => {
    const r = ready(buildQuoteRequest(draft({ days: [...FIVE, FIVE[0]] })));
    expect(r.input).toEqual({
      mealId: MEAL,
      mode: 'CALENDAR',
      days: ['2026-09-17', '2026-09-18', '2026-09-19', '2026-09-20', '2026-09-21'],
      delivery: { addressLine: 'ul. Marszałkowska 1', city: 'Warszawa', postalCode: '00-950' },
    });
  });

  it('never sends a price', () => {
    const r = ready(buildQuoteRequest(draft()));
    expect(Object.keys(r.input).sort()).toEqual(['days', 'delivery', 'mealId', 'mode']);
  });

  it('gives the same key to the same order however it was picked, and a new key to any change', () => {
    const a = ready(buildQuoteRequest(draft()));
    const b = ready(buildQuoteRequest(draft({ days: new Set([...FIVE].reverse()) })));
    expect(a.key).toBe(b.key);
    expect(ready(buildQuoteRequest(draft({ mode: 'ONE_TIME', days: ['2026-09-17'] }))).key).not.toBe(a.key);
    expect(ready(buildQuoteRequest(draft({ postalCode: '01-001' }))).key).not.toBe(a.key);
    expect(ready(buildQuoteRequest(draft({ mealId: 'other' }))).key).not.toBe(a.key);
  });
});

describe('classifyQuoteError', () => {
  it('reads 401 as signed out', () => {
    expect(classifyQuoteError(apiError(401))).toEqual({ kind: 'signedOut' });
  });

  it('reads the intake gate, with or without the code', () => {
    expect(classifyQuoteError(apiError(403, { code: 'INTAKE_INCOMPLETE' }))).toEqual({ kind: 'intake' });
    expect(classifyQuoteError(apiError(403))).toEqual({ kind: 'intake' });
    expect(classifyQuoteError(apiError(403, { code: 'INSUFFICIENT_ROLE' })).kind).toBe('other');
  });

  it('reads a 422 on delivery.postalCode as not delivered', () => {
    const err = apiError(422, {
      code: 'VALIDATION_FAILED',
      message: [{ field: 'delivery.postalCode', issue: 'NOT_DELIVERED', code: 'NOT_DELIVERED' }],
    });
    expect(classifyQuoteError(err)).toEqual({ kind: 'notDelivered' });
  });

  it('passes anything else through with its body for formatApiError', () => {
    const body = {
      statusCode: 422,
      error: 'x',
      code: 'VALIDATION_FAILED',
      message: [{ field: 'days', issue: 'DELIVERY_TOO_FAR', code: 'DELIVERY_TOO_FAR' }],
    };
    expect(classifyQuoteError(new ApiError(422, body))).toEqual({ kind: 'other', body });
    expect(classifyQuoteError(new Error('offline'))).toEqual({ kind: 'other', body: null });
  });
});

describe('summaryState', () => {
  const request = buildQuoteRequest(draft());
  const key = ready(request).key;

  it('is incomplete while the draft is', () => {
    const s = summaryState(buildQuoteRequest(draft({ days: [] })), view({ key, data: quote() }));
    expect(s).toEqual({ state: 'incomplete', missing: 'days' });
    expect(canPlaceOrder(s)).toBe(false);
  });

  it('is loading before the first answer, including while the debounce runs', () => {
    expect(summaryState(request, view())).toEqual({ state: 'loading' });
    expect(summaryState(request, view({ key, isFetching: true }))).toEqual({ state: 'loading' });
  });

  it('is ready and fresh when the answer is for exactly this request', () => {
    const s = summaryState(request, view({ key, data: quote() }));
    expect(s).toEqual({ state: 'ready', quote: quote(), fresh: true });
    expect(canPlaceOrder(s)).toBe(true);
  });

  it('keeps the previous total on screen but blocks the button while the selection moved on', () => {
    const debouncing = summaryState(request, view({ key: 'older', data: quote(), isPlaceholderData: true }));
    expect(debouncing).toMatchObject({ state: 'ready', fresh: false });
    expect(canPlaceOrder(debouncing)).toBe(false);

    const refetching = summaryState(request, view({ key, data: quote(), isPlaceholderData: true, isFetching: true }));
    expect(refetching).toMatchObject({ state: 'ready', fresh: false });
    expect(canPlaceOrder(refetching)).toBe(false);
  });

  it('shows a refusal only once it answers this request', () => {
    const error = apiError(422, {
      message: [{ field: 'delivery.postalCode', issue: 'NOT_DELIVERED', code: 'NOT_DELIVERED' }],
    });
    expect(summaryState(request, view({ key, error }))).toEqual({
      state: 'refused',
      refusal: { kind: 'notDelivered' },
    });
    // An error for an older key while the new one is being debounced is not shown.
    expect(summaryState(request, view({ key: 'older', error }))).toEqual({ state: 'loading' });
    expect(canPlaceOrder(summaryState(request, view({ key, error })))).toBe(false);
  });
});

describe('breakdownOf', () => {
  it('reads a quote and a placed order the same way', () => {
    const q = quote({ discountPercent: 10, discountGrosze: 4500, goodsGrosze: 45000, totalGrosze: 40500, dayCount: 10 });
    const fromQuote = breakdownOf(q);
    const { dayCount: _drop, ...orderish } = q;
    void _drop;
    const fromOrder = breakdownOf({ ...orderish, days: new Array(10).fill({}) });
    expect(fromOrder).toEqual(fromQuote);
    expect(fromQuote).toEqual({
      unitPriceGrosze: 4500,
      dayCount: 10,
      goodsGrosze: 45000,
      discountPercent: 10,
      discountGrosze: 4500,
      shippingGrosze: 0,
      totalGrosze: 40500,
    });
  });
});

describe('parseMealParam', () => {
  it('passes a uuid on and drops anything else', () => {
    expect(parseMealParam(MEAL)).toBe(MEAL);
    expect(parseMealParam(MEAL.toUpperCase())).toBe(MEAL);
    expect(parseMealParam([MEAL, 'x'])).toBe(MEAL);
    expect(parseMealParam('1; drop table')).toBeNull();
    expect(parseMealParam(undefined)).toBeNull();
  });
});
