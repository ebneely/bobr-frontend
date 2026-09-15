'use client';

import { useLocale, useTranslations } from 'next-intl';

import { Button } from '@/components/ui/Button';
import {
  consultationPayment,
  consultationStatusTone,
  consultationWhen,
  formatWarsawDate,
  formatWarsawDateTime,
  joinableMeetUrl,
  plainAmount,
  type PaymentState,
} from '@/lib/api/account-status';
import type { Consultation } from '@/lib/api/consultations';
import { formatGrosze } from '@/lib/api/orders';
import { formatBlikPhone } from '@/lib/delivery';
import { usePaymentSettings } from '@/lib/hooks/use-account';
import { CopyRow, StatusBadge } from './ui';

const PAYMENT_TONE: Record<PaymentState, 'ok' | 'alert' | 'off'> = {
  paid: 'ok',
  unpaid: 'alert',
  notDue: 'off',
};

/**
 * One consultation: status, time in Warsaw, the Meet link once confirmed, and
 * the BLIK payment with its paid/unpaid state. `compact` drops the customer's
 * note and the booking date for the overview.
 */
export function ConsultationCard({
  consultation: c,
  compact = false,
  headingLevel = 'h3',
  kicker,
  footer,
}: {
  consultation: Consultation;
  compact?: boolean;
  headingLevel?: 'h2' | 'h3';
  /** A small label above the title, for the overview board. */
  kicker?: string;
  footer?: React.ReactNode;
}) {
  const t = useTranslations('account');
  const tc = useTranslations('consultation');
  const locale = useLocale();

  const when = consultationWhen(c);
  const meet = joinableMeetUrl(c);
  const payment = consultationPayment(c);
  const Heading = headingLevel;

  return (
    <article
      className="bobr-acard"
      data-testid="consultation-card"
      data-status={c.status}
      data-payment={payment}
    >
      {kicker ? <p className="bobr-kicker">{kicker}</p> : null}
      <div className="bobr-acard__head" style={kicker ? { marginTop: '-0.5rem' } : undefined}>
        <Heading className="bobr-acard__title">
          {c.context === 'BEFORE_MEAL' ? tc('beforeMeal') : tc('beforePlan')}
        </Heading>
        <StatusBadge tone={consultationStatusTone(c.status)} testId="consultation-status">
          {t(`status.consultation.${c.status}`)}
        </StatusBadge>
      </div>

      <div>
        <p className="bobr-kicker">
          {when.confirmed ? t('consultations.scheduled') : t('consultations.preferred')}
        </p>
        <p className="bobr-amoney" data-testid="consultation-when" style={{ fontSize: 'var(--bobr-text-body)' }}>
          {formatWarsawDateTime(when.at, locale)}
        </p>
        {!when.confirmed && c.status === 'REQUESTED' ? (
          <p className="bobr-acard__body">{t('consultations.preferredHint')}</p>
        ) : null}
      </div>

      {meet ? (
        <div className="bobr-aaction">
          <Button externalHref={meet}>{t('consultations.joinMeet')}</Button>
        </div>
      ) : c.status === 'REQUESTED' ? (
        <p className="bobr-acard__body">{t('consultations.meetAfterConfirm')}</p>
      ) : null}

      {!compact && c.note ? (
        <div>
          <p className="bobr-kicker">{t('consultations.yourNote')}</p>
          <p className="bobr-anote__body">{c.note}</p>
        </div>
      ) : null}

      <div className="bobr-acard__meta" style={{ alignItems: 'center' }}>
        <span>
          {t('consultations.amount')}: <strong>{formatGrosze(c.priceGrosze, locale)}</strong>
        </span>
        <StatusBadge tone={PAYMENT_TONE[payment]} testId="consultation-payment">
          {t(`status.payment.${payment}`)}
        </StatusBadge>
        {c.paidAt ? <span>{t('consultations.paidOn', { date: formatWarsawDate(c.paidAt, locale) })}</span> : null}
        {!compact ? (
          <span>{t('consultations.bookedOn', { date: formatWarsawDate(c.createdAt, locale) })}</span>
        ) : null}
      </div>

      {payment === 'unpaid' ? <BlikBox priceGrosze={c.priceGrosze} reference={c.paymentReference} /> : null}

      {footer ? <div className="bobr-acard__foot">{footer}</div> : null}
    </article>
  );
}

/**
 * How to pay by BLIK. The number comes from the admin's payment settings; the
 * amount and the transfer title from the booking, where the server froze them.
 */
function BlikBox({ priceGrosze, reference }: { priceGrosze: number; reference: string }) {
  const t = useTranslations('account');
  const locale = useLocale();
  const settings = usePaymentSettings();
  const phone = settings.data?.blikPhone ?? null;
  const recipient = settings.data?.blikRecipientName ?? null;

  return (
    <div className="bobr-apay" data-testid="blik-box" data-configured={phone ? 'true' : 'false'}>
      <p className="bobr-apay__title">{t('consultations.payTitle')}</p>
      {settings.isPending ? (
        <p className="bobr-acard__body">{t('loading')}</p>
      ) : phone ? (
        <p className="bobr-acard__body">{t('consultations.paySteps')}</p>
      ) : (
        <p className="bobr-acard__body">{t('consultations.payPending')}</p>
      )}
      {phone ? (
        <CopyRow label={t('consultations.phone')} value={formatBlikPhone(phone)} copyValue={phone} testId="blik-phone" />
      ) : null}
      {phone && recipient ? (
        <div>
          <span className="bobr-copyrow__label">{t('consultations.recipient')}</span>
          <span className="bobr-copyrow__value">{recipient}</span>
        </div>
      ) : null}
      <CopyRow
        label={t('consultations.amount')}
        value={formatGrosze(priceGrosze, locale)}
        copyValue={plainAmount(priceGrosze, locale)}
        testId="blik-amount"
      />
      <CopyRow label={t('consultations.reference')} value={reference} testId="blik-reference" />
      <p className="bobr-aform__hint">{t('consultations.referenceHint')}</p>
    </div>
  );
}
