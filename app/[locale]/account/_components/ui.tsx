'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useLocale, useTranslations } from 'next-intl';

import { Button } from '@/components/ui/Button';
import { ApiError, formatApiError } from '@/lib/api/client';
import type { StatusTone } from '@/lib/api/account-status';
import { useApiErrorTranslate } from '@/lib/api/use-api-error';

/** A dot and a word. The word carries the meaning; colour only repeats it. */
export function StatusBadge({
  tone,
  children,
  testId,
}: {
  tone: StatusTone;
  children: ReactNode;
  testId?: string;
}) {
  return (
    <span className="bobr-badge" data-tone={tone} data-testid={testId}>
      {children}
    </span>
  );
}

export function SectionHead({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="bobr-asection-head">
      <div>
        <h2 className="bobr-asection-title">{title}</h2>
        {subtitle ? <p className="bobr-asection-sub">{subtitle}</p> : null}
      </div>
      {action ? <div className="bobr-aaction">{action}</div> : null}
    </div>
  );
}

export function EmptyState({
  title,
  body,
  action,
  testId,
}: {
  title: string;
  body?: string;
  action?: ReactNode;
  testId?: string;
}) {
  return (
    <div className="bobr-aempty" data-testid={testId}>
      <p className="bobr-aempty__title">{title}</p>
      {body ? <p className="bobr-aempty__body">{body}</p> : null}
      {action ? <div className="bobr-aaction">{action}</div> : null}
    </div>
  );
}

/**
 * What a tab shows instead of its content while a query is not ready: a
 * skeleton while loading; a sign-in card when the session has lapsed since the
 * server gate let the page through; otherwise the error with a retry.
 */
export function QueryGate({
  isPending,
  error,
  onRetry,
  path,
  skeleton = 2,
}: {
  isPending: boolean;
  error: unknown;
  onRetry: () => void;
  /** This page without the locale, for the login `next`. */
  path: string;
  skeleton?: number;
}) {
  const t = useTranslations('account');
  const locale = useLocale();
  const translateError = useApiErrorTranslate();

  if (error) {
    if (error instanceof ApiError && error.status === 401) {
      return (
        <EmptyState
          testId="account-signed-out"
          title={t('signedOutTitle')}
          body={t('signedOutBody')}
          action={
            <Button href={{ pathname: '/login', query: { next: `/${locale}${path}` } }}>
              {t('signIn')}
            </Button>
          }
        />
      );
    }
    const detail = error instanceof ApiError ? formatApiError(error.body, translateError) : '';
    return (
      <div className="bobr-aempty" data-tone="error" role="alert">
        <p className="bobr-aempty__title">{t('loadError')}</p>
        {detail ? <p className="bobr-aempty__detail">{detail}</p> : null}
        <div className="bobr-aaction">
          <Button variant="outline" onClick={onRetry}>
            {t('retry')}
          </Button>
        </div>
      </div>
    );
  }

  if (isPending) {
    return (
      <div className="bobr-askel" aria-busy="true" aria-label={t('loading')}>
        {Array.from({ length: skeleton }, (_, i) => (
          <span key={i} className="bobr-skel" />
        ))}
      </div>
    );
  }

  return null;
}

/** A labelled value with a button that copies it. */
export function CopyRow({
  label,
  value,
  copyValue,
  testId,
}: {
  label: string;
  value: string;
  copyValue?: string;
  testId: string;
}) {
  const t = useTranslations('account');
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
      await navigator.clipboard.writeText(copyValue ?? value);
      setCopied('ok');
    } catch {
      setCopied('failed');
    }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(null), 2500);
  }

  return (
    <div className="bobr-copyrow">
      <div style={{ minWidth: 0 }}>
        <span className="bobr-copyrow__label">{label}</span>
        <span className="bobr-copyrow__value" data-testid={testId}>
          {value}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <span
          aria-live="polite"
          style={{
            fontSize: 'var(--bobr-text-xs)',
            color: copied === 'failed' ? 'var(--bobr-danger)' : 'var(--bobr-fg-soft)',
          }}
        >
          {copied === 'ok' ? t('copied') : copied === 'failed' ? t('copyFailed') : ''}
        </span>
        <button
          type="button"
          className="bobr-copyrow__btn"
          onClick={copy}
          aria-label={`${t('copy')}: ${label}`}
        >
          {t('copy')}
        </button>
      </div>
    </div>
  );
}
