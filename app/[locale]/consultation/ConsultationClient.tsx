'use client';

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
} from 'react';
import { useLocale, useTranslations } from 'next-intl';

import { Button } from '@/components/ui/Button';
import { ApiError, formatApiError } from '@/lib/api/client';
import { useApiErrorTranslate } from '@/lib/api/use-api-error';
import {
  apiBookConsultation,
  CONSULTATION_NOTE_MAX,
  type Consultation,
  type ConsultationContext,
} from '@/lib/api/consultations';
import { formatGrosze } from '@/lib/api/orders';
import { apiGetPaymentSettings, type PaymentSettings } from '@/lib/api/settings';
import { authClient } from '@/lib/auth/client';
import { usePublicSettings } from '@/lib/hooks/use-settings';
import {
  daysThroughEndOfMonthsAfter,
  formatDayLabel,
  formatLongDay,
  formatMonthLabel,
  groupByMonth,
  slotTimes,
  warsawDaysFromToday,
  warsawWallClockToIso,
} from '@/lib/dates';
import { formatBlikPhone } from '@/lib/delivery';

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
  const translateError = useApiErrorTranslate();
  const locale = useLocale();
  const ids = useId();

  const { data: session, isPending } = authClient.useSession();
  // Price and bookable times are the admin's (`/v1/settings/public`).
  const settings = usePublicSettings().data;
  const times = useMemo(
    () =>
      settings
        ? slotTimes(
            settings.consultationSlotStart,
            settings.consultationSlotEnd,
            settings.consultationSlotStepMinutes,
          )
        : [],
    [settings],
  );

  // Bookable from Warsaw tomorrow through the end of next month.
  const dayGroups = useMemo(() => {
    const first = warsawDaysFromToday(1);
    return groupByMonth(daysThroughEndOfMonthsAfter(first, 1)).map((g) => ({
      month: g.month,
      label: formatMonthLabel(g.month, locale),
      days: g.days.map((iso) => ({ iso, label: formatDayLabel(iso, locale) })),
    }));
  }, [locale]);

  const [context, setContext] = useState<ConsultationContext>('BEFORE_PLAN');
  const [day, setDay] = useState<string>(() => warsawDaysFromToday(1));
  const [pickedTime, setTime] = useState<string | null>(null);
  // Until the customer picks, the first slot the admin offers.
  const time = pickedTime !== null && times.includes(pickedTime) ? pickedTime : (times[0] ?? '');
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
          : formatApiError(err instanceof ApiError ? err.body : null, translateError) || t('errorGeneric');
      setError(message);
    } finally {
      setBusy(false);
    }
  }

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
        <BlikInstructions
          priceGrosze={booked.row.priceGrosze}
          paymentReference={booked.row.paymentReference}
        />
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
              {times.map((slot) => (
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
        {settings && (
          <p className="bobr-body" style={{ fontSize: 'var(--bobr-text-sm)' }}>
            {t('price')}:{' '}
            <strong
              data-testid="consultation-price"
              style={{ color: 'var(--bobr-accent)', fontWeight: 'var(--bobr-weight-bold)' }}
            >
              {formatGrosze(settings.consultationPriceGrosze, locale)}
            </strong>
        </p>
        )}

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

/**
 * How to pay for the consultation, shown once it is booked.
 *
 * The number comes from the admin's payment settings, read after booking
 * rather than before, so a number changed in the meantime is the one shown.
 * The amount and the transfer title come from the booking itself — the
 * server froze the price on the row and derived the reference from its id.
 */
function BlikInstructions({
  priceGrosze,
  paymentReference,
}: {
  priceGrosze: number;
  paymentReference: string;
}) {
  const t = useTranslations('consultation');
  const locale = useLocale();
  // undefined while loading; null when the settings could not be read, which
  // is treated like "not configured yet" — the reference is still shown.
  const [settings, setSettings] = useState<PaymentSettings | null | undefined>(undefined);

  useEffect(() => {
    let live = true;
    apiGetPaymentSettings()
      .then((s) => {
        if (live) setSettings(s);
      })
      .catch(() => {
        if (live) setSettings(null);
      });
    return () => {
      live = false;
    };
  }, []);

  const phone = settings?.blikPhone ?? null;
  const recipient = settings?.blikRecipientName ?? null;

  return (
    <div
      data-testid="blik-instructions"
      data-configured={settings === undefined ? 'loading' : phone ? 'true' : 'false'}
      style={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.875rem',
        padding: '1.25rem',
        borderRadius: 'var(--bobr-radius)',
        background: 'var(--bobr-bg-alt)',
      }}
    >
      <h3 className="bobr-h4">{phone ? t('blikTitle') : t('paymentTitle')}</h3>
      {phone ? (
        <p className="bobr-body" data-testid="blik-steps" style={{ fontSize: 'var(--bobr-text-sm)' }}>
          {t('blikSteps')}
        </p>
      ) : null}
      <p
        data-testid="blik-amount"
        style={{
          fontSize: 'var(--bobr-text-h4)',
          fontWeight: 'var(--bobr-weight-bold)',
          color: 'var(--bobr-accent)',
        }}
      >
        {formatGrosze(priceGrosze, locale)}
      </p>

      {settings === undefined ? (
        <p className="bobr-body" style={{ fontSize: 'var(--bobr-text-sm)' }}>
          {t('blikLoading')}
        </p>
      ) : phone ? (
        <>
          <CopyRow
            label={t('blikPhone')}
            value={formatBlikPhone(phone)}
            copyValue={phone}
            testId="blik-phone"
          />
          {recipient && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
              <span style={rowLabelStyle}>{t('blikRecipient')}</span>
              <span data-testid="blik-recipient" style={rowValueStyle}>
                {recipient}
              </span>
            </div>
          )}
        </>
      ) : (
        <p
          className="bobr-body"
          data-testid="blik-pending"
          style={{ fontSize: 'var(--bobr-text-sm)' }}
        >
          {t('blikPending')}
        </p>
      )}

      <CopyRow
        label={t('blikReference')}
        value={paymentReference}
        copyValue={paymentReference}
        testId="blik-reference"
      />
      <p style={{ fontSize: 'var(--bobr-text-sm)', color: 'var(--bobr-fg-muted)' }}>
        {t('blikReferenceHint')}
      </p>
    </div>
  );
}

const rowLabelStyle: CSSProperties = {
  fontSize: 'var(--bobr-text-xs)',
  color: 'var(--bobr-fg-muted)',
};

const rowValueStyle: CSSProperties = {
  fontSize: 'var(--bobr-text-body)',
  fontWeight: 'var(--bobr-weight-semibold)',
  color: 'var(--bobr-fg)',
  overflowWrap: 'anywhere',
};

/** A labelled value with a button that copies it to the clipboard. */
function CopyRow({
  label,
  value,
  copyValue,
  testId,
}: {
  label: string;
  value: string;
  copyValue: string;
  testId: string;
}) {
  const t = useTranslations('consultation');
  const [copied, setCopied] = useState<'ok' | 'failed' | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  async function copy() {
    try {
      await navigator.clipboard.writeText(copyValue);
      setCopied('ok');
    } catch {
      setCopied('failed');
    }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(null), 2500);
  }

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '0.5rem 1rem',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', minWidth: 0 }}>
        <span style={rowLabelStyle}>{label}</span>
        <span data-testid={testId} style={rowValueStyle}>
          {value}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <span
          aria-live="polite"
          data-testid={`${testId}-copied`}
          style={{
            fontSize: 'var(--bobr-text-sm)',
            color: copied === 'failed' ? 'var(--bobr-danger)' : 'var(--bobr-fg-muted)',
          }}
        >
          {copied === 'ok' ? t('copied') : copied === 'failed' ? t('copyFailed') : ''}
        </span>
        <button
          type="button"
          data-copy={testId}
          onClick={copy}
          aria-label={`${t('copy')}: ${label}`}
          style={{
            padding: '0.5rem 0.9rem',
            font: 'inherit',
            fontSize: 'var(--bobr-text-sm)',
            fontWeight: 'var(--bobr-weight-medium)',
            color: 'var(--bobr-fg)',
            background: 'var(--bobr-surface)',
            border: '1px solid var(--bobr-border)',
            borderRadius: 'var(--bobr-radius-control)',
            cursor: 'pointer',
          }}
        >
          {t('copy')}
        </button>
      </div>
    </div>
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
