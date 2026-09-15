'use client';

import { useId, useState, type FormEvent } from 'react';
import { useLocale, useTranslations } from 'next-intl';

import { Button } from '@/components/ui/Button';
import { ApiError, formatApiError } from '@/lib/api/client';
import { formatWarsawDate, formatWarsawDateTime, noteState, shortId, sortNotes } from '@/lib/api/account-status';
import { NOTE_BODY_MAX, type NoteKind } from '@/lib/api/orders';
import { useApiErrorTranslate } from '@/lib/api/use-api-error';
import { useMyNotes, useMyOrders, useRaiseNote } from '@/lib/hooks/use-account';
import { Link } from '@/lib/i18n/navigation';
import { useOrderMealName } from '../_components/order-bits';
import { QueryGate, SectionHead, StatusBadge } from '../_components/ui';

type Kind = Extract<NoteKind, 'NOTE' | 'COMPLAINT'>;

export function NotesClient({ initialOrderId }: { initialOrderId: string | null }) {
  const t = useTranslations('account');
  const notes = useMyNotes();

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <SectionHead title={t('notes.title')} subtitle={t('notes.subtitle')} />
      <div className="bobr-anotes">
        <div className="bobr-anotes__form">
          <RaiseNoteForm initialOrderId={initialOrderId} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', minWidth: 0 }}>
          <h3 className="bobr-acard__title">{t('notes.listTitle')}</h3>
          {!notes.data ? (
            <QueryGate
              isPending={notes.isPending}
              error={notes.error}
              onRetry={() => void notes.refetch()}
              path="/account/notes"
              skeleton={1}
            />
          ) : notes.data.length === 0 ? (
            <p className="bobr-aempty" data-testid="notes-empty" style={{ color: 'var(--bobr-fg-soft)' }}>
              {t('notes.emptyBody')}
            </p>
          ) : (
            <NotesList notes={notes.data} />
          )}
        </div>
      </div>
    </section>
  );
}

function NotesList({ notes }: { notes: NonNullable<ReturnType<typeof useMyNotes>['data']> }) {
  const t = useTranslations('account');
  const locale = useLocale();

  return (
    <ul className="bobr-alist" data-testid="notes-list">
      {sortNotes(notes).map((n) => {
        const state = noteState(n);
        const orderId = n.order?.id ?? n.orderId;
        return (
          <li key={n.id}>
            <article className="bobr-acard" data-testid="note-card" data-state={state} data-kind={n.kind}>
              <div className="bobr-acard__head">
                <p className="bobr-kicker">
                  <span>{t(`noteKind.${n.kind}`)}</span>
                  <span aria-hidden>·</span>
                  <span>{t('notes.sentOn', { date: formatWarsawDate(n.createdAt, locale) })}</span>
                </p>
                <StatusBadge tone={state === 'answered' ? 'ok' : 'waiting'} testId="note-status">
                  {t(`status.note.${state}`)}
                </StatusBadge>
              </div>
              {orderId ? (
                <Link href={`/account/orders/${orderId}`} className="bobr-alink" style={{ minHeight: 0, alignSelf: 'flex-start' }}>
                  {t('notes.aboutOrder', { id: shortId(orderId) })}
                </Link>
              ) : null}
              <p className="bobr-anote__body">{n.body}</p>
              {state === 'answered' ? (
                <div className="bobr-anote__reply" data-testid="note-reply">
                  <strong>{t('notes.reply')}</strong>
                  <p>{n.adminReply}</p>
                  {n.repliedAt ? (
                    <span className="bobr-aform__hint">{formatWarsawDateTime(n.repliedAt, locale)}</span>
                  ) : null}
                </div>
              ) : (
                <p className="bobr-acard__body">{t('notes.awaitingBody')}</p>
              )}
            </article>
          </li>
        );
      })}
    </ul>
  );
}

function RaiseNoteForm({ initialOrderId }: { initialOrderId: string | null }) {
  const t = useTranslations('account');
  const locale = useLocale();
  const ids = useId();
  const translateError = useApiErrorTranslate();
  const orders = useMyOrders();
  const mealName = useOrderMealName();
  const raise = useRaiseNote();

  const [kind, setKind] = useState<Kind>(initialOrderId ? 'COMPLAINT' : 'NOTE');
  const [orderId, setOrderId] = useState<string>(initialOrderId ?? '');
  const [body, setBody] = useState('');
  const [status, setStatus] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (raise.isPending) return;
    const trimmed = body.trim();
    if (!trimmed) {
      setStatus({ tone: 'error', text: t('notes.errBody') });
      return;
    }
    setStatus(null);
    try {
      await raise.mutateAsync({ kind, body: trimmed, orderId: orderId || null });
      setBody('');
      setStatus({ tone: 'ok', text: t('notes.sent') });
    } catch (err) {
      const text =
        err instanceof ApiError && err.status === 401
          ? t('signedOutBody')
          : formatApiError(err instanceof ApiError ? err.body : null, translateError) || t('notes.errGeneric');
      setStatus({ tone: 'error', text });
    }
  }

  const kinds: { value: Kind; hint: string }[] = [
    { value: 'NOTE', hint: t('notes.kindNoteHint') },
    { value: 'COMPLAINT', hint: t('notes.kindComplaintHint') },
  ];

  return (
    <form className="bobr-acard bobr-aform" onSubmit={submit} noValidate data-testid="note-form">
      <h3 className="bobr-acard__title">{t('notes.formTitle')}</h3>

      <fieldset>
        <legend>{t('notes.kind')}</legend>
        <div className="bobr-akinds">
          {kinds.map((k) => (
            <label key={k.value} className="bobr-akind" data-kind={k.value}>
              <input
                type="radio"
                name="kind"
                value={k.value}
                checked={kind === k.value}
                onChange={() => setKind(k.value)}
              />
              <span>{t(`noteKind.${k.value}`)}</span>
              <small>{k.hint}</small>
            </label>
          ))}
        </div>
      </fieldset>

      {orders.data && orders.data.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <label htmlFor={`${ids}-order`}>{t('notes.about')}</label>
          <select
            id={`${ids}-order`}
            className="bobr-aform__control"
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
          >
            <option value="">{t('notes.aboutNone')}</option>
            {orders.data.map((o) => (
              <option key={o.id} value={o.id}>
                {t('notes.aboutOption', {
                  id: shortId(o.id),
                  meal: mealName(o),
                  date: formatWarsawDate(o.createdAt, locale),
                })}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        <label htmlFor={`${ids}-body`}>{t('notes.body')}</label>
        <textarea
          id={`${ids}-body`}
          className="bobr-aform__control"
          rows={5}
          maxLength={NOTE_BODY_MAX}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          aria-describedby={`${ids}-hint`}
          style={{ resize: 'vertical' }}
        />
        <p id={`${ids}-hint`} className="bobr-aform__hint">
          {t('notes.bodyHint', { count: body.length, max: NOTE_BODY_MAX })}
        </p>
      </div>

      <p className="bobr-aform__status" role="status" aria-live="polite" data-tone={status?.tone}>
        {status?.text}
      </p>

      <div className="bobr-aaction">
        <Button type="submit">{raise.isPending ? t('notes.submitting') : t('notes.submit')}</Button>
      </div>
    </form>
  );
}
