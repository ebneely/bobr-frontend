'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { useLocale, useTranslations } from 'next-intl';

import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { ApiError, formatApiError } from '@/lib/api/client';
import { useApiErrorTranslate } from '@/lib/api/use-api-error';
import type { WeightEntry } from '@/lib/api/weight';
import { formatLongDay, todayInWarsaw } from '@/lib/dates';
import { useAddWeightEntry, useMyWeight } from '@/lib/hooks/use-account';
import { EmptyState, QueryGate, SectionHead } from '../_components/ui';

/** G32 — a weight check-in, its history, and a small trend line. */
export function WeightClient() {
  const t = useTranslations('account');
  const weight = useMyWeight();

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <SectionHead title={t('weight.title')} subtitle={t('weight.subtitle')} />

      <div className="bobr-agrid">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(1rem, 2vw, 1.5rem)', minWidth: 0 }}>
          <AddWeightForm />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(1rem, 2vw, 1.5rem)', minWidth: 0 }}>
          {!weight.data ? (
            <article className="bobr-acard">
              <QueryGate
                isPending={weight.isPending}
                error={weight.error}
                onRetry={() => void weight.refetch()}
                path="/account/weight"
              />
            </article>
          ) : weight.data.length === 0 ? (
            <EmptyState testId="weight-empty" title={t('weight.emptyTitle')} body={t('weight.emptyBody')} />
          ) : (
            <>
              <TrendCard entries={weight.data} />
              <HistoryCard entries={weight.data} />
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function AddWeightForm() {
  const t = useTranslations('account');
  const translateError = useApiErrorTranslate();
  const add = useAddWeightEntry();

  const [weightKg, setWeightKg] = useState('');
  const [note, setNote] = useState('');
  const [attempted, setAttempted] = useState(false);
  const [saved, setSaved] = useState(false);

  const parsed = Number(weightKg.replace(',', '.'));
  const valid = weightKg.trim() !== '' && Number.isFinite(parsed) && parsed > 0;

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setAttempted(true);
    setSaved(false);
    if (!valid) return;
    try {
      await add.mutateAsync({ weightKg: parsed, note: note.trim() === '' ? null : note.trim() });
      setSaved(true);
      setNote('');
    } catch {
      // The status line below reads add.error.
    }
  }

  const apiMessage =
    add.error instanceof ApiError ? formatApiError(add.error.body, translateError) : null;

  return (
    <form className="bobr-acard bobr-aform" onSubmit={submit} noValidate data-testid="weight-form">
      <div>
        <h3 className="bobr-acard__title">{t('weight.addTitle')}</h3>
        <p className="bobr-acard__body" style={{ marginTop: '0.375rem' }}>
          {t('weight.addBody')}
        </p>
      </div>
      <Field
        label={t('weight.weightKg')}
        type="text"
        inputMode="decimal"
        name="weightKg"
        autoComplete="off"
        value={weightKg}
        onChange={(e) => {
          setWeightKg(e.target.value);
          setSaved(false);
        }}
        hint={t('weight.weightHint')}
        error={attempted && !valid ? t('weight.errWeight') : undefined}
      />
      <Field
        label={`${t('weight.note')} (${t('weight.optional')})`}
        type="text"
        name="note"
        autoComplete="off"
        value={note}
        onChange={(e) => {
          setNote(e.target.value);
          setSaved(false);
        }}
      />
      <p
        className="bobr-aform__status"
        role="status"
        aria-live="polite"
        data-tone={saved ? 'ok' : apiMessage ? 'error' : undefined}
        data-testid="weight-status"
      >
        {apiMessage ?? (saved ? t('weight.saved') : '')}
      </p>
      <div className="bobr-aaction">
        <Button type="submit">{add.isPending ? t('weight.saving') : t('weight.save')}</Button>
      </div>
    </form>
  );
}

function HistoryCard({ entries }: { entries: WeightEntry[] }) {
  const t = useTranslations('account');
  const locale = useLocale();

  return (
    <article className="bobr-acard" data-testid="weight-history">
      <h3 className="bobr-acard__title">{t('weight.historyTitle')}</h3>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        {entries.map((entry) => (
          <li
            key={entry.id}
            data-testid="weight-entry"
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              gap: '0.25rem 1rem',
              paddingBlock: '0.6rem',
              borderBottom: '1px dashed var(--bobr-border)',
            }}
          >
            <span style={{ fontSize: 'var(--bobr-text-sm)', color: 'var(--bobr-fg-muted)' }}>
              {entry.measuredOn === todayInWarsaw() ? t('weight.today') : formatLongDay(entry.measuredOn, locale)}
            </span>
            <span style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', minWidth: 0 }}>
              {entry.note ? (
                <span style={{ fontSize: 'var(--bobr-text-sm)', color: 'var(--bobr-fg-muted)', overflowWrap: 'anywhere' }}>
                  {entry.note}
                </span>
              ) : null}
              <strong style={{ fontSize: 'var(--bobr-text-h4)' }}>{t('weight.kg', { value: entry.weightKg })}</strong>
            </span>
          </li>
        ))}
      </ul>
    </article>
  );
}

/** A minimal inline SVG sparkline — no charting dependency. */
function TrendCard({ entries }: { entries: WeightEntry[] }) {
  const t = useTranslations('account');

  // `entries` is newest first (the API's order); the trend reads left-to-right,
  // oldest to newest.
  const points = useMemo(() => [...entries].reverse().map((e) => Number(e.weightKg)), [entries]);

  if (points.length < 2) {
    return (
      <article className="bobr-acard" data-testid="weight-trend">
        <h3 className="bobr-acard__title">{t('weight.trendTitle')}</h3>
        <p className="bobr-acard__body">{t('weight.trendNeedMore')}</p>
      </article>
    );
  }

  const width = 320;
  const height = 80;
  const pad = 8;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;

  const coords = points.map((value, i) => {
    const x = pad + (i * (width - 2 * pad)) / (points.length - 1);
    const y = pad + (height - 2 * pad) * (1 - (value - min) / span);
    return [x, y] as const;
  });
  const path = coords.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');

  return (
    <article className="bobr-acard" data-testid="weight-trend">
      <div className="bobr-acard__head">
        <h3 className="bobr-acard__title">{t('weight.trendTitle')}</h3>
        <span className="bobr-acard__body">
          {t('weight.trendRange', { min: min.toFixed(1), max: max.toFixed(1) })}
        </span>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height={height}
        role="img"
        aria-label={t('weight.trendTitle')}
        style={{ display: 'block', maxWidth: '100%' }}
      >
        <path d={path} fill="none" stroke="var(--bobr-accent)" strokeWidth={2} />
        {coords.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={2.5} fill="var(--bobr-accent)" />
        ))}
      </svg>
    </article>
  );
}
