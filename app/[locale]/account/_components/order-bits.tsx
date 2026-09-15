'use client';

import { useLocale, useTranslations } from 'next-intl';

import { orderStatusTone } from '@/lib/api/account-status';
import type { Order } from '@/lib/api/orders';
import { StatusBadge } from './ui';

/** The meal's name in the page language, or the diet type when it is missing. */
export function useOrderMealName() {
  const locale = useLocale();
  const t = useTranslations('account');
  const tm = useTranslations('mealTypes');
  return (order: Order): string => {
    if (!order.meal) return t('tabs.orders');
    const name = locale === 'pl' ? order.meal.namePl : order.meal.nameEn;
    if (name) return name;
    return tm.has(order.meal.type) ? tm(order.meal.type) : order.meal.type;
  };
}

export function OrderStatusBadge({ order }: { order: Pick<Order, 'status'> }) {
  const t = useTranslations('account');
  return (
    <StatusBadge tone={orderStatusTone(order.status)} testId="order-status">
      {t(`status.order.${order.status}`)}
    </StatusBadge>
  );
}
