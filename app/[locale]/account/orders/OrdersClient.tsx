'use client';

import { useLocale, useTranslations } from 'next-intl';

import { Button } from '@/components/ui/Button';
import {
  formatWarsawDate,
  isOrderLive,
  orderDayRange,
  pricedDayCount,
  remainingDays,
  shortId,
} from '@/lib/api/account-status';
import { formatGrosze } from '@/lib/api/orders';
import { formatDayLabel, todayInWarsaw } from '@/lib/dates';
import { useMyOrders } from '@/lib/hooks/use-account';
import { Link } from '@/lib/i18n/navigation';
import { OrderStatusBadge, useOrderMealName } from '../_components/order-bits';
import { EmptyState, QueryGate, SectionHead } from '../_components/ui';

export function OrdersClient() {
  const t = useTranslations('account');
  const locale = useLocale();
  const orders = useMyOrders();
  const mealName = useOrderMealName();

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <SectionHead
        title={t('orders.title')}
        subtitle={t('orders.subtitle')}
        action={
          orders.data && orders.data.length > 0 ? (
            <Button variant="outline" href="/order">
              {t('overview.orderCta')}
            </Button>
          ) : undefined
        }
      />

      {!orders.data ? (
        <QueryGate
          isPending={orders.isPending}
          error={orders.error}
          onRetry={() => void orders.refetch()}
          path="/account/orders"
        />
      ) : orders.data.length === 0 ? (
        <EmptyState
          testId="orders-empty"
          title={t('orders.emptyTitle')}
          body={t('orders.emptyBody')}
          action={<Button href="/order">{t('overview.orderCta')}</Button>}
        />
      ) : (
        <ul className="bobr-alist" data-testid="orders-list">
          {orders.data.map((order) => {
            const range = orderDayRange(order);
            const today = todayInWarsaw();
            const left = remainingDays(order, today);
            return (
              <li key={order.id}>
                <article className="bobr-acard bobr-acard--link" data-testid="order-card" data-status={order.status}>
                  <div className="bobr-acard__head">
                    <p className="bobr-kicker">{t('orders.number', { id: shortId(order.id) })}</p>
                    <OrderStatusBadge order={order} />
                  </div>
                  <h3 className="bobr-acard__title">
                    <Link href={`/account/orders/${order.id}`} className="bobr-acard__stretch">
                      {mealName(order)}
                    </Link>
                  </h3>
                  <div className="bobr-acard__meta">
                    <span>{t(`mode.${order.mode}`)}</span>
                    <span>{t('orders.dayCount', { count: pricedDayCount(order) })}</span>
                    {range ? (
                      <span>
                        {range.first === range.last
                          ? formatDayLabel(range.first, locale)
                          : `${formatDayLabel(range.first, locale)} – ${formatDayLabel(range.last, locale)}`}
                      </span>
                    ) : null}
                    {isOrderLive(order) && left > 0 && left < pricedDayCount(order) ? (
                      <span>{t('orders.daysRemaining', { remaining: left, total: pricedDayCount(order) })}</span>
                    ) : null}
                  </div>
                  <div className="bobr-acard__meta" style={{ justifyContent: 'space-between' }}>
                    <span>{t('orders.placedOn', { date: formatWarsawDate(order.createdAt, locale) })}</span>
                    <span>
                      {t('orders.total')}{' '}
                      <strong style={{ fontSize: 'var(--bobr-text-h4)' }}>
                        {formatGrosze(order.totalGrosze, locale)}
                      </strong>
                    </span>
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
