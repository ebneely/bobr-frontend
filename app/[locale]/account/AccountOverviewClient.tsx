'use client';

import type { ReactNode } from 'react';
import { useLocale, useTranslations } from 'next-intl';

import { Button } from '@/components/ui/Button';
import { ApiError } from '@/lib/api/client';
import {
  formatWarsawDate,
  intakeState,
  latestOrder,
  nextDelivery,
  noteState,
  pricedDayCount,
  remainingDays,
  shortId,
  sortNotes,
  unpaidConsultations,
  upcomingConsultation,
  type IntakeState,
} from '@/lib/api/account-status';
import { formatGrosze } from '@/lib/api/orders';
import { formatLongDay, todayInWarsaw } from '@/lib/dates';
import {
  useMyConsultations,
  useMyIntake,
  useMyNotes,
  useMyOrders,
} from '@/lib/hooks/use-account';
import { Link } from '@/lib/i18n/navigation';
import { ConsultationCard } from './_components/ConsultationCard';
import { OrderStatusBadge, useOrderMealName } from './_components/order-bits';
import { StatusBadge } from './_components/ui';

const INTAKE_TONE: Record<IntakeState, 'ok' | 'waiting' | 'alert'> = {
  complete: 'ok',
  incomplete: 'waiting',
  missing: 'alert',
};

/**
 * The overview. Each card owns its own query, so one slow or failing API
 * leaves the rest of the board readable instead of blanking the page.
 */
export function AccountOverviewClient() {
  const t = useTranslations('account');
  const consultations = useMyConsultations();
  const unpaid = consultations.data ? unpaidConsultations(consultations.data) : [];

  return (
    <section aria-labelledby="account-overview-title" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <h2 id="account-overview-title" className="bobr-sr-only">
        {t('overview.title')}
      </h2>

      {unpaid.length > 0 ? (
        <div className="bobr-aalert" role="status" data-testid="unpaid-alert">
          <span>{t('overview.unpaidAlert', { count: unpaid.length })}</span>
          <Link href="/account/consultations" className="bobr-alink">
            {t('overview.unpaidCta')}
          </Link>
        </div>
      ) : null}

      <div className="bobr-agrid">
        <NextDeliveryCard />
        <IntakeCard />
        <UpcomingConsultationCard query={consultations} />
        <LatestOrderCard />
        <NotesCard />
      </div>
    </section>
  );
}

function CardShell({
  kicker,
  badge,
  children,
  wide,
  testId,
}: {
  kicker: string;
  badge?: ReactNode;
  children: ReactNode;
  wide?: boolean;
  testId: string;
}) {
  return (
    <article className={`bobr-acard${wide ? ' bobr-acard--wide' : ''}`} data-testid={testId}>
      <div className="bobr-acard__head">
        <h3 className="bobr-kicker">{kicker}</h3>
        {badge}
      </div>
      {children}
    </article>
  );
}

/** Inline loading / error for a single card. */
function CardQuery({
  isPending,
  error,
  refetch,
}: {
  isPending: boolean;
  error: unknown;
  refetch: () => void;
}) {
  const t = useTranslations('account');
  if (error) {
    const signedOut = error instanceof ApiError && error.status === 401;
    return (
      <div role="alert" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.25rem' }}>
        <p className="bobr-acard__body" style={{ color: 'var(--bobr-danger)' }}>
          {signedOut ? t('signedOutBody') : t('loadError')}
        </p>
        {signedOut ? (
          <Link href="/login" className="bobr-alink">
            {t('signIn')}
          </Link>
        ) : (
          <button type="button" className="bobr-textbtn" onClick={() => refetch()}>
            {t('retry')}
          </button>
        )}
      </div>
    );
  }
  if (isPending) {
    return (
      <div aria-busy="true" aria-label={t('loading')} style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        <span className="bobr-skel" style={{ height: '2rem', width: '70%' }} />
        <span className="bobr-skel" style={{ height: '1rem', width: '90%' }} />
        <span className="bobr-skel" style={{ height: '1rem', width: '55%' }} />
      </div>
    );
  }
  return null;
}

function NextDeliveryCard() {
  const t = useTranslations('account');
  const locale = useLocale();
  const orders = useMyOrders();
  const mealName = useOrderMealName();

  if (!orders.data) {
    return (
      <CardShell kicker={t('overview.nextDeliveryTitle')} testId="overview-next-delivery">
        <CardQuery isPending={orders.isPending} error={orders.error} refetch={orders.refetch} />
      </CardShell>
    );
  }

  const today = todayInWarsaw();
  const next = nextDelivery(orders.data, today);

  if (!next) {
    return (
      <CardShell kicker={t('overview.nextDeliveryTitle')} testId="overview-next-delivery">
        <p className="bobr-acard__title">{t('overview.noDeliveryTitle')}</p>
        <p className="bobr-acard__body">{t('overview.noDeliveryBody')}</p>
        <div className="bobr-acard__foot">
          <div className="bobr-aaction">
            <Button href="/order">{t('overview.orderCta')}</Button>
          </div>
        </div>
      </CardShell>
    );
  }

  const isToday = next.day === today;
  const longDay = formatLongDay(next.day, locale);

  return (
    <article className="bobr-acard bobr-acard--next" data-testid="overview-next-delivery" data-day={next.day}>
      <div className="bobr-acard__head">
        <h3 className="bobr-kicker">{t('overview.nextDeliveryTitle')}</h3>
        <OrderStatusBadge order={next.order} />
      </div>
      <p className="bobr-anext__day">
        {isToday ? (
          <>
            <em>{t('status.day.today')}</em> · {longDay}
          </>
        ) : (
          longDay
        )}
      </p>
      <div className="bobr-acard__meta">
        <strong>{mealName(next.order)}</strong>
        <span>{t(`mode.${next.order.mode}`)}</span>
        <span>{t('overview.remaining', { count: remainingDays(next.order, today) })}</span>
      </div>
      <div className="bobr-acard__foot">
        <Link href={`/account/orders/${next.order.id}`} className="bobr-alink">
          {t('overview.seeOrder')}
        </Link>
      </div>
    </article>
  );
}

function IntakeCard() {
  const t = useTranslations('account');
  const intake = useMyIntake();

  if (intake.isPending || intake.error) {
    return (
      <CardShell kicker={t('overview.intakeTitle')} testId="overview-intake">
        <CardQuery isPending={intake.isPending} error={intake.error} refetch={intake.refetch} />
      </CardShell>
    );
  }

  const profile = intake.data ?? null;
  const state = intakeState(profile);
  const missingPhotos = profile?.missingPhotos.length ?? 0;

  return (
    <CardShell
      kicker={t('overview.intakeTitle')}
      testId="overview-intake"
      badge={
        <StatusBadge tone={INTAKE_TONE[state]} testId="intake-status">
          {t(`status.intake.${state}`)}
        </StatusBadge>
      }
    >
      <p className="bobr-acard__body" style={{ fontSize: 'var(--bobr-text-body)' }}>
        {state === 'complete'
          ? t('overview.intakeComplete')
          : state === 'missing'
            ? t('overview.intakeMissing')
            : missingPhotos > 0
              ? t('overview.intakeIncomplete', { count: missingPhotos })
              : t('overview.intakeIncompleteData')}
      </p>
      <div className="bobr-acard__foot">
        {state === 'complete' ? (
          <Link href="/intake" className="bobr-alink">
            {t('overview.intakeView')}
          </Link>
        ) : (
          <div className="bobr-aaction">
            <Button href="/intake">{t('overview.intakeCta')}</Button>
          </div>
        )}
      </div>
    </CardShell>
  );
}

function UpcomingConsultationCard({ query }: { query: ReturnType<typeof useMyConsultations> }) {
  const t = useTranslations('account');

  if (!query.data) {
    return (
      <CardShell kicker={t('overview.consultationTitle')} testId="overview-consultation">
        <CardQuery isPending={query.isPending} error={query.error} refetch={query.refetch} />
      </CardShell>
    );
  }

  const upcoming = upcomingConsultation(query.data, new Date());

  if (!upcoming) {
    return (
      <CardShell kicker={t('overview.consultationTitle')} testId="overview-consultation">
        <p className="bobr-acard__body" style={{ fontSize: 'var(--bobr-text-body)' }}>
          {t('overview.noConsultationBody')}
        </p>
        <div className="bobr-acard__foot">
          <div className="bobr-aaction">
            <Button variant="outline" href="/consultation">
              {t('overview.consultationCta')}
            </Button>
          </div>
          {query.data.length > 0 ? (
            <Link href="/account/consultations" className="bobr-alink">
              {t('overview.seeConsultations')}
            </Link>
          ) : null}
        </div>
      </CardShell>
    );
  }

  return (
    <div data-testid="overview-consultation" style={{ display: 'flex', minWidth: 0 }}>
      <div style={{ width: '100%', display: 'flex' }}>
        <ConsultationCard
          consultation={upcoming}
          compact
          kicker={t('overview.consultationTitle')}
          footer={
            <Link href="/account/consultations" className="bobr-alink">
              {t('overview.seeConsultations')}
            </Link>
          }
        />
      </div>
    </div>
  );
}

function LatestOrderCard() {
  const t = useTranslations('account');
  const locale = useLocale();
  const orders = useMyOrders();
  const mealName = useOrderMealName();

  if (!orders.data) {
    return (
      <CardShell kicker={t('overview.latestOrderTitle')} testId="overview-latest-order">
        <CardQuery isPending={orders.isPending} error={orders.error} refetch={orders.refetch} />
      </CardShell>
    );
  }

  const latest = latestOrder(orders.data);

  if (!latest) {
    return (
      <CardShell kicker={t('overview.latestOrderTitle')} testId="overview-latest-order">
        <p className="bobr-acard__body" style={{ fontSize: 'var(--bobr-text-body)' }}>
          {t('overview.noOrdersBody')}
        </p>
        <div className="bobr-acard__foot">
          <Link href="/order" className="bobr-alink">
            {t('overview.orderCta')}
          </Link>
        </div>
      </CardShell>
    );
  }

  return (
    <CardShell
      kicker={t('overview.latestOrderTitle')}
      testId="overview-latest-order"
      badge={<OrderStatusBadge order={latest} />}
    >
      <p className="bobr-acard__title">{mealName(latest)}</p>
      <div className="bobr-acard__meta">
        <span>{t('orders.number', { id: shortId(latest.id) })}</span>
        <span>{t(`mode.${latest.mode}`)}</span>
        <span>{t('orders.dayCount', { count: pricedDayCount(latest) })}</span>
      </div>
      <div className="bobr-acard__meta">
        <span>
          {t('orders.total')}: <strong>{formatGrosze(latest.totalGrosze, locale)}</strong>
        </span>
        <span>{t('orders.placedOn', { date: formatWarsawDate(latest.createdAt, locale) })}</span>
      </div>
      <div className="bobr-acard__foot">
        <Link href={`/account/orders/${latest.id}`} className="bobr-alink">
          {t('details')}
        </Link>
        {orders.data.length > 1 ? (
          <Link href="/account/orders" className="bobr-alink">
            {t('viewAll')}
          </Link>
        ) : null}
      </div>
    </CardShell>
  );
}

function NotesCard() {
  const t = useTranslations('account');
  const locale = useLocale();
  const notes = useMyNotes();

  if (!notes.data) {
    return (
      <CardShell kicker={t('overview.notesTitle')} testId="overview-notes" wide>
        <CardQuery isPending={notes.isPending} error={notes.error} refetch={notes.refetch} />
      </CardShell>
    );
  }

  if (notes.data.length === 0) {
    return (
      <CardShell kicker={t('overview.notesTitle')} testId="overview-notes" wide>
        <p className="bobr-acard__body" style={{ fontSize: 'var(--bobr-text-body)' }}>
          {t('overview.noNotesBody')}
        </p>
        <div className="bobr-acard__foot">
          <Link href="/account/notes" className="bobr-alink">
            {t('overview.notesCta')}
          </Link>
        </div>
      </CardShell>
    );
  }

  const awaiting = notes.data.filter((n) => noteState(n) === 'awaiting').length;
  const shown = sortNotes(notes.data).slice(0, 3);

  return (
    <CardShell
      kicker={t('overview.notesTitle')}
      testId="overview-notes"
      wide
      badge={
        <StatusBadge tone={awaiting > 0 ? 'waiting' : 'ok'}>
          {awaiting > 0 ? t('overview.notesAwaiting', { count: awaiting }) : t('overview.notesAllAnswered')}
        </StatusBadge>
      }
    >
      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {shown.map((n) => {
          const state = noteState(n);
          return (
            <li
              key={n.id}
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.5rem 1rem',
                paddingBlock: '0.75rem',
                borderBottom: '1px dashed var(--bobr-border)',
              }}
            >
              <div style={{ minWidth: 0, flex: '1 1 16rem' }}>
                <p className="bobr-kicker">
                  {t(`noteKind.${n.kind}`)} · {formatWarsawDate(n.createdAt, locale)}
                </p>
                <p
                  style={{
                    color: 'var(--bobr-fg)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {n.body}
                </p>
              </div>
              <StatusBadge tone={state === 'answered' ? 'ok' : 'waiting'}>{t(`status.note.${state}`)}</StatusBadge>
            </li>
          );
        })}
      </ul>
      <div className="bobr-acard__foot">
        <Link href="/account/notes" className="bobr-alink">
          {t('viewAll')}
        </Link>
      </div>
    </CardShell>
  );
}
