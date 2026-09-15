'use client';

import { useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';

import { Button } from '@/components/ui/Button';
import { ApiError, formatApiError } from '@/lib/api/client';
import {
  dayTiming,
  formatWarsawDate,
  nextDelivery,
  orderDayKey,
  remainingDays,
  shortId,
} from '@/lib/api/account-status';
import { canCancelRemaining, dayActions } from '@/lib/api/order-day-actions';
import { effectiveTotalGrosze, formatGrosze, type Consumption, type Order, type OrderDay } from '@/lib/api/orders';
import { useApiErrorTranslate } from '@/lib/api/use-api-error';
import {
  formatDayLabel,
  formatMonthLabel,
  groupByMonth,
  offeredDeliveryDays,
  todayInWarsaw,
} from '@/lib/dates';
import { useCancelOrder, useMoveDay, useMyOrder, useSkipDay, useTrackDay } from '@/lib/hooks/use-account';
import { Link } from '@/lib/i18n/navigation';
import { OrderStatusBadge, useOrderMealName } from '../../_components/order-bits';
import { EmptyState, QueryGate, StatusBadge } from '../../_components/ui';
import type { StatusTone } from '@/lib/api/account-status';

const DAY_STATUS_TONE: Record<OrderDay['status'], StatusTone> = {
  SCHEDULED: 'waiting',
  DELIVERED: 'done',
  FAILED: 'alert',
  SKIPPED: 'off',
  CANCELLED: 'off',
};

export function OrderDetailClient({ id }: { id: string }) {
  const t = useTranslations('account');
  const order = useMyOrder(id);
  const path = `/account/orders/${id}`;

  const back = (
    <Link href="/account/orders" className="bobr-alink" style={{ alignSelf: 'flex-start' }}>
      ← {t('orders.back')}
    </Link>
  );

  if (!order.data) {
    const notFound = order.error instanceof ApiError && order.error.status === 404;
    return (
      <section style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {back}
        {notFound ? (
          <EmptyState
            testId="order-not-found"
            title={t('orders.notFoundTitle')}
            body={t('orders.notFoundBody')}
            action={<Button href="/account/orders">{t('orders.back')}</Button>}
          />
        ) : (
          <QueryGate
            isPending={order.isPending}
            error={order.error}
            onRetry={() => void order.refetch()}
            path={path}
          />
        )}
      </section>
    );
  }

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {back}
      <OrderDetail order={order.data} />
    </section>
  );
}

function OrderDetail({ order }: { order: Order }) {
  const t = useTranslations('account');
  const locale = useLocale();
  const mealName = useOrderMealName();

  const today = todayInWarsaw();
  const next = nextDelivery([order], today);
  const left = remainingDays(order, today);
  const zone = order.delivery
    ? locale === 'pl'
      ? order.delivery.zoneNamePl
      : order.delivery.zoneNameEn
    : null;
  const effectiveTotal = effectiveTotalGrosze(order);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(1rem, 2vw, 1.5rem)' }} data-testid="order-detail">
      <div className="bobr-asection-head">
        <div>
          <p className="bobr-kicker">{t('orders.number', { id: shortId(order.id) })}</p>
          <h2 className="bobr-asection-title">{mealName(order)}</h2>
          <div className="bobr-acard__meta">
            <span>{t(`mode.${order.mode}`)}</span>
            <span>{t('orders.placedOn', { date: formatWarsawDate(order.createdAt, locale) })}</span>
          </div>
        </div>
        <OrderStatusBadge order={order} />
      </div>

      <div className="bobr-aorder">
        <article className="bobr-acard" data-testid="order-days">
          <div className="bobr-acard__head">
            <h3 className="bobr-acard__title">{t('orders.daysTitle')}</h3>
            <span className="bobr-acard__body">
              {t('orders.daysRemaining', { remaining: left, total: order.days.length })}
            </span>
          </div>
          <DayList order={order} today={today} nextDay={next?.day ?? null} />
        </article>

        <div className="bobr-aorder__side">
          <article className="bobr-acard" data-testid="order-price">
            <h3 className="bobr-acard__title">{t('orders.priceTitle')}</h3>
            <dl className="bobr-arows">
              <div>
                <dt>{t('orders.unitPrice')}</dt>
                <dd>{formatGrosze(order.unitPriceGrosze, locale)}</dd>
              </div>
              <div>
                <dt>{t('orders.days')}</dt>
                <dd>{order.days.length}</dd>
              </div>
              <div>
                <dt>{t('orders.goods')}</dt>
                <dd>{formatGrosze(order.goodsGrosze, locale)}</dd>
              </div>
              <div>
                <dt>{t('orders.discount', { percent: order.discountPercent })}</dt>
                <dd>
                  {order.discountGrosze > 0 ? '−' : ''}
                  {formatGrosze(order.discountGrosze, locale)}
                </dd>
              </div>
              <div>
                <dt>{t('orders.shipping')}</dt>
                <dd>
                  {order.shippingGrosze === 0
                    ? t('orders.shippingFree')
                    : formatGrosze(order.shippingGrosze, locale)}
                </dd>
              </div>
              <div className="bobr-arows__total">
                <dt>{order.adjustedTotalGrosze != null ? t('orders.adjustedTotal') : t('orders.totalDue')}</dt>
                <dd data-testid="order-total">{formatGrosze(effectiveTotal, locale)}</dd>
              </div>
            </dl>
            <p className="bobr-aform__hint">{t('orders.priceFrozen')}</p>
            {order.cancelledAt ? (
              <p className="bobr-aform__hint" data-testid="order-cancelled-note">
                {t('orders.cancelledOn', { date: formatWarsawDate(order.cancelledAt, locale) })}
                {order.cancelReason ? ` — ${order.cancelReason}` : ''}
              </p>
            ) : null}
          </article>

          <article className="bobr-acard" data-testid="order-payment">
            <div className="bobr-acard__head">
              <h3 className="bobr-acard__title">{t('orders.paymentTitle')}</h3>
              <span className="bobr-badge" data-tone="done">
                {t('orders.paymentCod')}
              </span>
            </div>
            <p className="bobr-acard__body">{t('orders.paymentCodBody')}</p>
          </article>

          <article className="bobr-acard" data-testid="order-delivery">
            <h3 className="bobr-acard__title">{t('orders.deliveryTitle')}</h3>
            {order.delivery ? (
              <address style={{ fontStyle: 'normal', color: 'var(--bobr-fg-strong)' }}>
                {order.delivery.addressLine}
                <br />
                {order.delivery.postalCode} {order.delivery.city}
              </address>
            ) : (
              <p className="bobr-acard__body">{t('orders.noAddress')}</p>
            )}
            {zone ? <p className="bobr-acard__body">{t('orders.zone', { zone })}</p> : null}
            {order.contactPhone ? (
              <p className="bobr-acard__body" data-testid="order-contact-phone">
                {t('orders.contactPhone')}: {order.contactPhone}
              </p>
            ) : null}
            {order.deliveryNotes ? (
              <p className="bobr-acard__body" data-testid="order-delivery-notes">
                {t('orders.deliveryNotes')}: {order.deliveryNotes}
              </p>
            ) : null}
          </article>

          <CancelOrderCard order={order} />

          <Link
            href={{ pathname: '/account/notes', query: { order: order.id } }}
            className="bobr-alink"
            style={{ alignSelf: 'flex-start' }}
          >
            {t('orders.raiseNote')}
          </Link>
        </div>
      </div>
    </div>
  );
}

function DayList({
  order,
  today,
  nextDay,
}: {
  order: Order;
  today: string;
  nextDay: string | null;
}) {
  const locale = useLocale();
  const dayKeys = order.days.map((d) => ({ day: d, key: orderDayKey(d.deliverOn) }));
  const months = groupByMonth(dayKeys.map((d) => d.key));
  const byKey = new Map(dayKeys.map((d) => [d.key, d.day]));

  return (
    <>
      {months.map((m) => (
        <div key={m.month} className="bobr-amonth">
          <p className="bobr-amonth__label">{formatMonthLabel(m.month, locale)}</p>
          <ul className="bobr-adaylist">
            {m.days.map((key) => {
              const day = byKey.get(key);
              if (!day) return null;
              return (
                <DayRow
                  key={day.id}
                  order={order}
                  day={day}
                  dayKey={key}
                  today={today}
                  isNext={nextDay === key && order.status !== 'CANCELLED'}
                />
              );
            })}
          </ul>
        </div>
      ))}
    </>
  );
}

function DayRow({
  order,
  day,
  dayKey,
  today,
  isNext,
}: {
  order: Order;
  day: OrderDay;
  dayKey: string;
  today: string;
  isNext: boolean;
}) {
  const t = useTranslations('account');
  const locale = useLocale();
  const translateError = useApiErrorTranslate();
  const timing = dayTiming(day.deliverOn, today);
  const actions = dayActions(day, today);

  const track = useTrackDay(order.id);
  const skip = useSkipDay();
  const move = useMoveDay();

  const [confirmSkip, setConfirmSkip] = useState(false);
  const [moving, setMoving] = useState(false);
  const [moveTo, setMoveTo] = useState('');

  // The same window the order form offers — earliest deliverable day through
  // the end of next month — minus dates this order already has, so a move
  // cannot collide with another day of the same order.
  const takenDates = useMemo(
    () => new Set(order.days.filter((d) => d.id !== day.id).map((d) => orderDayKey(d.deliverOn))),
    [order.days, day.id],
  );
  const moveOptions = useMemo(
    () => offeredDeliveryDays().filter((d) => !takenDates.has(d)),
    [takenDates],
  );

  function trackError(mutation: { error: unknown }) {
    return mutation.error instanceof ApiError ? formatApiError(mutation.error.body, translateError) : null;
  }

  return (
    <li className="bobr-adayrow" data-testid="order-day-row" data-day={dayKey} data-status={day.status} data-timing={timing}>
      <div className="bobr-adayrow__head">
        <span className="bobr-adayrow__date">
          {formatDayLabel(dayKey, locale)}
          {isNext && timing !== 'today' ? ` · ${t('overview.nextDeliveryTitle')}` : ''}
        </span>
        <StatusBadge tone={DAY_STATUS_TONE[day.status]} testId="order-day-status">
          {t(`status.orderDay.${day.status}`)}
        </StatusBadge>
      </div>

      {day.consumption !== 'UNRECORDED' ? (
        <p className="bobr-adayrow__note" data-testid="order-day-consumption">
          {t(`status.consumption.${day.consumption}`)}
          {day.consumptionNote ? ` — ${day.consumptionNote}` : ''}
        </p>
      ) : null}

      {actions.canTrack ? (
        <div className="bobr-adayrow__actions">
          <Button
            variant="outline"
            onClick={() => track.mutate({ dayId: day.id, consumption: 'EATEN' as Consumption })}
          >
            {t('orders.markEaten')}
          </Button>
          <Button
            variant="outline"
            onClick={() => track.mutate({ dayId: day.id, consumption: 'SKIPPED' as Consumption })}
          >
            {t('orders.markSkipped')}
          </Button>
        </div>
      ) : null}
      {track.isError ? (
        <p role="alert" style={{ fontSize: 'var(--bobr-text-sm)', color: 'var(--bobr-danger)' }}>
          {trackError(track) ?? t('orders.actionFailed')}
        </p>
      ) : null}

      {actions.canSkip || actions.canMove ? (
        <div className="bobr-adayrow__actions" data-testid="order-day-change-actions">
          {actions.canSkip &&
            (confirmSkip ? (
              <div className="bobr-adayrow__confirm" data-testid="skip-confirm">
                <p>{t('orders.skipConfirmBody')}</p>
                <div className="bobr-adayrow__actions">
                  <Button
                    onClick={() => {
                      skip.mutate(
                        { orderId: order.id, dayId: day.id },
                        { onSuccess: () => setConfirmSkip(false) },
                      );
                    }}
                  >
                    {skip.isPending ? t('orders.working') : t('orders.skipConfirm')}
                  </Button>
                  <Button variant="outline" onClick={() => setConfirmSkip(false)}>
                    {t('orders.cancelAction')}
                  </Button>
                </div>
              </div>
            ) : (
              <Button variant="outline" onClick={() => setConfirmSkip(true)}>
                {t('orders.skipDay')}
              </Button>
            ))}

          {actions.canMove &&
            (moving ? (
              <div className="bobr-adayrow__confirm" data-testid="move-confirm">
                <p>{t('orders.moveConfirmBody')}</p>
                <select
                  className="bobr-aform__control"
                  data-testid="move-day-select"
                  value={moveTo}
                  onChange={(e) => setMoveTo(e.target.value)}
                >
                  <option value="">{t('orders.movePick')}</option>
                  {moveOptions.map((d) => (
                    <option key={d} value={d}>
                      {formatDayLabel(d, locale)}
                    </option>
                  ))}
                </select>
                <div className="bobr-adayrow__actions">
                  <Button
                    onClick={() => {
                      if (!moveTo) return;
                      move.mutate(
                        { orderId: order.id, dayId: day.id, to: moveTo },
                        { onSuccess: () => setMoving(false) },
                      );
                    }}
                  >
                    {move.isPending ? t('orders.working') : t('orders.moveConfirm')}
                  </Button>
                  <Button variant="outline" onClick={() => setMoving(false)}>
                    {t('orders.cancelAction')}
                  </Button>
                </div>
              </div>
            ) : (
              <Button variant="outline" onClick={() => setMoving(true)}>
                {t('orders.moveDay')}
              </Button>
            ))}
        </div>
      ) : null}
      {(skip.isError || move.isError) && (
        <p role="alert" style={{ fontSize: 'var(--bobr-text-sm)', color: 'var(--bobr-danger)' }}>
          {trackError(skip.isError ? skip : move) ?? t('orders.actionFailed')}
        </p>
      )}
    </li>
  );
}

function CancelOrderCard({ order }: { order: Order }) {
  const t = useTranslations('account');
  const translateError = useApiErrorTranslate();
  const cancel = useCancelOrder();
  const [confirming, setConfirming] = useState(false);
  const [reason, setReason] = useState('');

  const allowed = canCancelRemaining(order);
  if (order.status === 'CANCELLED' || !allowed) return null;

  const apiMessage = cancel.error instanceof ApiError ? formatApiError(cancel.error.body, translateError) : null;

  return (
    <article className="bobr-acard" data-testid="order-cancel">
      {confirming ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <h3 className="bobr-acard__title">{t('orders.cancelTitle')}</h3>
          <p className="bobr-acard__body">{t('orders.cancelBody')}</p>
          <textarea
            className="bobr-aform__control"
            data-testid="cancel-reason"
            rows={3}
            placeholder={t('orders.cancelReasonPlaceholder')}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={300}
          />
          {apiMessage ? (
            <p role="alert" style={{ fontSize: 'var(--bobr-text-sm)', color: 'var(--bobr-danger)' }}>
              {apiMessage}
            </p>
          ) : null}
          <div className="bobr-aaction">
            <Button
              onClick={() => {
                if (!reason.trim()) return;
                cancel.mutate(
                  { orderId: order.id, reason: reason.trim() },
                  { onSuccess: () => setConfirming(false) },
                );
              }}
            >
              {cancel.isPending ? t('orders.working') : t('orders.cancelConfirm')}
            </Button>
            <Button variant="outline" onClick={() => setConfirming(false)}>
              {t('orders.cancelAction')}
            </Button>
          </div>
        </div>
      ) : (
        <div className="bobr-aaction">
          <Button variant="outline" onClick={() => setConfirming(true)}>
            {t('orders.cancelTitle')}
          </Button>
        </div>
      )}
    </article>
  );
}
