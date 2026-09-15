'use client';

import { useLocale, useTranslations } from 'next-intl';

import { Button } from '@/components/ui/Button';
import { ApiError } from '@/lib/api/client';
import {
  dayTiming,
  formatWarsawDate,
  nextDelivery,
  orderDayKey,
  remainingDays,
  shortId,
} from '@/lib/api/account-status';
import { formatGrosze, type Order } from '@/lib/api/orders';
import { formatDayLabel, formatMonthLabel, groupByMonth, todayInWarsaw } from '@/lib/dates';
import { useMyOrder } from '@/lib/hooks/use-account';
import { Link } from '@/lib/i18n/navigation';
import { OrderStatusBadge, useOrderMealName } from '../../_components/order-bits';
import { EmptyState, QueryGate } from '../../_components/ui';

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
  const dayKeys = order.days.map((d) => orderDayKey(d.deliverOn));
  const months = groupByMonth(dayKeys);
  const left = remainingDays(order, today);
  const zone = order.delivery
    ? locale === 'pl'
      ? order.delivery.zoneNamePl
      : order.delivery.zoneNameEn
    : null;

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
          {months.map((m) => (
            <div key={m.month} className="bobr-amonth">
              <p className="bobr-amonth__label">{formatMonthLabel(m.month, locale)}</p>
              <ul className="bobr-adays">
                {m.days.map((day) => {
                  const timing = dayTiming(day, today);
                  const isNext = next?.day === day && order.status !== 'CANCELLED';
                  return (
                    <li
                      key={day}
                      className="bobr-aday"
                      data-timing={timing}
                      data-next={isNext ? 'true' : undefined}
                      data-day={day}
                    >
                      <span>{formatDayLabel(day, locale)}</span>
                      <small>
                        {isNext && timing !== 'today'
                          ? t('overview.nextDeliveryTitle')
                          : t(`status.day.${timing}`)}
                      </small>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
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
                <dt>{t('orders.totalDue')}</dt>
                <dd data-testid="order-total">{formatGrosze(order.totalGrosze, locale)}</dd>
              </div>
            </dl>
            <p className="bobr-aform__hint">{t('orders.priceFrozen')}</p>
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
          </article>

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
