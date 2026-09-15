'use client';

import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/Button';
import { consultationWhen } from '@/lib/api/account-status';
import type { Consultation } from '@/lib/api/consultations';
import { useMyConsultations } from '@/lib/hooks/use-account';
import { ConsultationCard } from '../_components/ConsultationCard';
import { EmptyState, QueryGate, SectionHead } from '../_components/ui';

/** Open bookings first (soonest on top), then the finished and cancelled ones, newest first. */
function ordered(list: Consultation[]): Consultation[] {
  const time = (c: Consultation) => new Date(consultationWhen(c).at).getTime();
  const open = list
    .filter((c) => c.status === 'REQUESTED' || c.status === 'CONFIRMED')
    .sort((a, b) => time(a) - time(b));
  const closed = list
    .filter((c) => c.status !== 'REQUESTED' && c.status !== 'CONFIRMED')
    .sort((a, b) => time(b) - time(a));
  return [...open, ...closed];
}

export function ConsultationsClient() {
  const t = useTranslations('account');
  const consultations = useMyConsultations();

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <SectionHead
        title={t('consultations.title')}
        subtitle={t('consultations.subtitle')}
        action={
          consultations.data && consultations.data.length > 0 ? (
            <Button variant="outline" href="/consultation">
              {t('consultations.bookAnother')}
            </Button>
          ) : undefined
        }
      />

      {!consultations.data ? (
        <QueryGate
          isPending={consultations.isPending}
          error={consultations.error}
          onRetry={() => void consultations.refetch()}
          path="/account/consultations"
        />
      ) : consultations.data.length === 0 ? (
        <EmptyState
          testId="consultations-empty"
          title={t('consultations.emptyTitle')}
          body={t('consultations.emptyBody')}
          action={<Button href="/consultation">{t('consultations.bookCta')}</Button>}
        />
      ) : (
        <ul className="bobr-agrid" style={{ listStyle: 'none', margin: 0, padding: 0 }} data-testid="consultations-list">
          {ordered(consultations.data).map((c) => (
            <li key={c.id} style={{ display: 'flex', minWidth: 0 }}>
              <div style={{ width: '100%' }}>
                <ConsultationCard consultation={c} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
