'use client';

import { useId, useMemo, useState, type CSSProperties, type FormEvent } from 'react';
import { useLocale, useTranslations } from 'next-intl';

import { Button } from '@/components/ui/Button';
import { ApiError, formatApiError } from '@/lib/api/client';
import {
  apiBookConsultation,
  CONSULTATION_NOTE_MAX,
  CONSULTATION_PRICE_GROSZE,
  type Consultation,
  type ConsultationContext,
} from '@/lib/api/consultations';
import { formatGrosze } from '@/lib/api/orders';
import { authClient } from '@/lib/auth/client';
import { DASHBOARD_URL } from '@/lib/auth/urls';
import {
  daysThroughEndOfNextMonth,
  formatDayLabel,
  formatLongDay,
  formatMonthLabel,
  groupByMonth,
  warsawDaysFromToday,
  warsawWallClockToIso,
} from '@/lib/dates';

/** Full and half hours, 08:00 through 20:00, Warsaw wall clock. */
const TIMES: string[] = Array.from({ length: 25 }, (_, i) => {
  const minutes = 8 * 60 + i * 30;
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
});

const controlStyle: CSSProperties = {
  width: '100%',
  padding: '0.8rem 1rem',
  fontFamily: 'inherit',
  fontSize: 'var(--bobr-text-body)',
  color: 'var(--bobr-fg)',
  background: 'var(--bobr-surface)',
  border: '1px solid var(--bobr-border)',
  borderRadius: 'var(--bobr-radius-control)',
  outline: 'none',
};

const labelStyle: CSSProperties = {
  fontSize: 'var(--bobr-text-sm)',
  fontWeight: 'var(--bobr-weight-medium)',
  color: 'var(--bobr-fg)',
};

export function ConsultationClient() {
  const t = useTranslations('consultation');
  const locale = useLocale();
  const ids = useId();

  const { data: session, isPending } = authClient.useSession();

  // Bookable from Warsaw tomorrow through the end of next month.
  const dayGroups = useMemo(() => {
    const first = warsawDaysFromToday(1);
    return groupByMonth(daysThroughEndOfNextMonth(first)).map((g) => ({
      month: g.month,
      label: formatMonthLabel(g.month, locale),
      days: g.days.map((iso) => ({ iso, label: formatDayLabel(iso, locale) })),
    }));
  }, [locale]);

  const [context, setContext] = useState<ConsultationContext>('BEFORE_PLAN');
  const [day, setDay] = useState<string>(() => warsawDaysFromToday(1));
  const [time, setTime] = useState<string>('10:00');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [booked, setBooked] = useState<{ row: Consultation; day: string; time: string } | null>(
    null,
  );

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      const trimmed = note.trim();
      const row = await apiBookConsultation({
        context,
        preferredAt: warsawWallClockToIso(day, time),
        ...(trimmed ? { note: trimmed } : {}),
      });
      setBooked({ row, day, time });
    } catch (err) {
      const message =
        err instanceof ApiError && err.status === 401
          ? t('errorSignedOut')
          : formatApiError(err instanceof ApiError ? err.body : null) || t('errorGeneric');
      setError(message);
    } finally {
      setBusy(false);
    }
  }

  const dashboardLink = `${DASHBOARD_URL}/${locale}/dashboard/consultations`;

  if (booked) {
    return (
      <section
        data-testid="consultation-booked"
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
        <p className="bobr-body">
          {t('successBody', {
            when: `${formatLongDay(booked.day, locale)}, ${booked.time}`,
          })}
        </p>
        <p
          style={{
            fontSize: 'var(--bobr-text-h4)',
            fontWeight: 'var(--bobr-weight-bold)',
            color: 'var(--bobr-accent)',
          }}
        >
          {formatGrosze(booked.row.priceGrosze, locale)}
        </p>
        <a href={dashboardLink} style={{ textDecoration: 'none' }}>
          <Button>{t('goDashboard')}</Button>
        </a>
      </section>
    );
  }

  if (isPending) {
    return <div aria-hidden style={{ minHeight: '20rem' }} />;
  }

  if (!session) {
    return (
      <section style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'flex-start' }}>
        <h2 className="bobr-h4">{t('signInTitle')}</h2>
        <p className="bobr-body">{t('signInBody')}</p>
        {/* Carries this page as `next`, so signing in returns to the booking
            instead of dropping the visitor on the dashboard. */}
        <Button href={{ pathname: '/login', query: { next: `/${locale}/consultation` } }}>
          {t('signIn')}
        </Button>
      </section>
    );
  }

  return (
    <form
      onSubmit={submit}
      noValidate
      style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}
    >
      <fieldset style={{ border: 0, margin: 0, padding: 0 }}>
        <legend className="bobr-h4" style={{ marginBottom: '0.875rem' }}>
          {t('pickContext')}
        </legend>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 14rem), 1fr))',
            gap: '0.75rem',
          }}
        >
          <ContextChoice
            value="BEFORE_MEAL"
            checked={context === 'BEFORE_MEAL'}
            onSelect={setContext}
            title={t('beforeMeal')}
            note={t('beforeMealNote')}
          />
          <ContextChoice
            value="BEFORE_PLAN"
            checked={context === 'BEFORE_PLAN'}
            onSelect={setContext}
            title={t('beforePlan')}
            note={t('beforePlanNote')}
          />
        </div>
      </fieldset>

      <fieldset style={{ border: 0, margin: 0, padding: 0 }}>
        <legend className="bobr-h4" style={{ marginBottom: '0.875rem' }}>
          {t('pickWhen')}
        </legend>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 14rem), 1fr))',
            gap: '1.25rem',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label htmlFor={`${ids}-day`} style={labelStyle}>
              {t('date')}
            </label>
            <select
              id={`${ids}-day`}
              name="day"
              value={day}
              onChange={(e) => setDay(e.target.value)}
              style={controlStyle}
            >
              {dayGroups.map((g) => (
                <optgroup key={g.month} label={g.label}>
                  {g.days.map((d) => (
                    <option key={d.iso} value={d.iso}>
                      {d.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label htmlFor={`${ids}-time`} style={labelStyle}>
              {t('time')}
            </label>
            <select
              id={`${ids}-time`}
              name="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              style={controlStyle}
            >
              {TIMES.map((slot) => (
                <option key={slot} value={slot}>
                  {slot}
                </option>
              ))}
            </select>
          </div>
        </div>
        <p
          style={{
            marginTop: '0.5rem',
            fontSize: 'var(--bobr-text-sm)',
            color: 'var(--bobr-fg-muted)',
          }}
        >
          {t('whenHint')}
        </p>
      </fieldset>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        <label htmlFor={`${ids}-note`} style={labelStyle}>
          {`${t('note')} (${t('optional')})`}
        </label>
        <textarea
          id={`${ids}-note`}
          name="note"
          rows={4}
          maxLength={CONSULTATION_NOTE_MAX}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          aria-describedby={`${ids}-note-hint`}
          style={{ ...controlStyle, resize: 'vertical' }}
        />
        <p
          id={`${ids}-note-hint`}
          style={{ fontSize: 'var(--bobr-text-sm)', color: 'var(--bobr-fg-muted)' }}
        >
          {t('noteHint', { count: note.length, max: CONSULTATION_NOTE_MAX })}
        </p>
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.875rem',
          alignItems: 'flex-start',
        }}
      >
        <p className="bobr-body" style={{ fontSize: 'var(--bobr-text-sm)' }}>
          {t('price')}:{' '}
          <strong
            data-testid="consultation-price"
            style={{ color: 'var(--bobr-accent)', fontWeight: 'var(--bobr-weight-bold)' }}
          >
            {formatGrosze(CONSULTATION_PRICE_GROSZE, locale)}
          </strong>
        </p>

        <p
          role="status"
          aria-live="polite"
          style={{
            minHeight: '1.2em',
            fontSize: 'var(--bobr-text-sm)',
            whiteSpace: 'pre-line',
            color: 'var(--bobr-danger)',
          }}
        >
          {error}
        </p>

        <Button type="submit">{busy ? t('submitting') : t('submit')}</Button>
      </div>
    </form>
  );
}

function ContextChoice({
  value,
  checked,
  onSelect,
  title,
  note,
}: {
  value: ConsultationContext;
  checked: boolean;
  onSelect: (value: ConsultationContext) => void;
  title: string;
  note: string;
}) {
  return (
    <label
      data-context={value}
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
        name="context"
        value={value}
        checked={checked}
        onChange={() => onSelect(value)}
        style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}
      />
      <span style={{ fontWeight: 'var(--bobr-weight-semibold)' }}>{title}</span>
      <span style={{ fontSize: 'var(--bobr-text-sm)', color: 'var(--bobr-fg-muted)' }}>{note}</span>
    </label>
  );
}
