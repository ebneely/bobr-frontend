'use client';

import { useState, type FormEvent } from 'react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import {
  classifyPasswordChangeError,
  PASSWORD_MAX,
  PASSWORD_MIN,
  validatePasswordChange,
  type PasswordChangeFailure,
  type PasswordChangeProblem,
} from '@/lib/api/password';
import { intakeState } from '@/lib/api/account-status';
import { ApiError, formatApiError } from '@/lib/api/client';
import type { MeLocale } from '@/lib/api/me';
import { useApiErrorTranslate } from '@/lib/api/use-api-error';
import { authClient } from '@/lib/auth/client';
import { useMe, useMyIntake, useUpdateMe } from '@/lib/hooks/use-account';
import { Link, useRouter } from '@/lib/i18n/navigation';
import { SectionHead, StatusBadge } from '../_components/ui';

export function ProfileClient({
  serverName,
  serverEmail,
}: {
  serverName: string | null;
  serverEmail: string | null;
}) {
  const t = useTranslations('account');
  const { data: session } = authClient.useSession();
  const intake = useMyIntake();

  // The server's read renders first; the client session takes over once loaded.
  const name = session?.user.name ?? serverName;
  const email = session?.user.email ?? serverEmail;
  const state = intake.data !== undefined ? intakeState(intake.data) : null;

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <SectionHead title={t('profile.title')} subtitle={t('profile.subtitle')} />

      <div className="bobr-agrid">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(1rem, 2vw, 1.5rem)', minWidth: 0 }}>
          <DetailsForm email={email} fallbackName={name} />

          <article className="bobr-acard" data-testid="profile-intake">
            <div className="bobr-acard__head">
              <h3 className="bobr-acard__title">{t('profile.intakeTitle')}</h3>
              {state ? (
                <StatusBadge tone={state === 'complete' ? 'ok' : state === 'incomplete' ? 'waiting' : 'alert'}>
                  {t(`status.intake.${state}`)}
                </StatusBadge>
              ) : null}
            </div>
            <p className="bobr-acard__body">{t('profile.intakeBody')}</p>
            <Link href="/intake" className="bobr-alink" style={{ alignSelf: 'flex-start' }}>
              {t('profile.intakeLink')}
            </Link>
          </article>
        </div>

        <ChangePasswordForm />
      </div>
    </section>
  );
}

const LOCALE_ROUTE: Record<MeLocale, string> = { PL: 'pl', EN: 'en' };

/** G09 — name, phone and language, PATCHed to `/v1/me`. */
function DetailsForm({ email, fallbackName }: { email: string | null; fallbackName: string | null }) {
  const t = useTranslations('account');
  const translateError = useApiErrorTranslate();
  const router = useRouter();
  const me = useMe();
  const update = useUpdateMe();

  // `null` means "not edited in this browser yet" — the field then falls back
  // to the server's own value on every render. No effect needed to seed the
  // form once the query resolves, and no cascading-render footgun either.
  const [fullNameEdit, setFullNameEdit] = useState<string | null>(null);
  const [phoneEdit, setPhoneEdit] = useState<string | null>(null);
  const [localeEdit, setLocaleEdit] = useState<MeLocale | null>(null);
  const [saved, setSaved] = useState(false);

  const fullName = fullNameEdit ?? me.data?.fullName ?? '';
  const phone = phoneEdit ?? me.data?.phone ?? '';
  const locale = localeEdit ?? me.data?.locale ?? 'PL';

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaved(false);
    const current = me.data;
    if (!current) return;

    const patch: { fullName?: string; phone?: string; locale?: MeLocale } = {};
    if (fullName.trim() !== (current.fullName ?? '')) patch.fullName = fullName.trim();
    if (phone.trim() !== (current.phone ?? '')) patch.phone = phone.trim();
    if (locale !== current.locale) patch.locale = locale;

    // Nothing changed: the API would answer EMPTY_UPDATE, so skip the round trip.
    if (Object.keys(patch).length === 0) {
      setSaved(true);
      return;
    }

    try {
      const next = await update.mutateAsync(patch);
      setSaved(true);
      if (patch.locale) {
        router.replace('/account/profile', { locale: LOCALE_ROUTE[next.locale] });
      }
    } catch {
      // The status line below reads update.error.
    }
  }

  const apiMessage =
    update.error instanceof ApiError ? formatApiError(update.error.body, translateError) : null;

  return (
    <form className="bobr-acard bobr-aform" onSubmit={submit} noValidate data-testid="profile-details">
      <div>
        <h3 className="bobr-acard__title">{t('profile.detailsTitle')}</h3>
      </div>

      <Field label={t('profile.email')} value={email ?? '—'} disabled readOnly />

      <Field
        label={t('profile.name')}
        name="fullName"
        autoComplete="name"
        value={fullName || fallbackName || ''}
        onChange={(e) => {
          setFullNameEdit(e.target.value);
          setSaved(false);
        }}
      />

      <Field
        label={t('profile.phone')}
        type="tel"
        name="phone"
        autoComplete="tel"
        placeholder="+48 600 000 000"
        value={phone}
        onChange={(e) => {
          setPhoneEdit(e.target.value);
          setSaved(false);
        }}
        hint={t('profile.phoneHint')}
      />

      <div>
        <span
          style={{
            display: 'block',
            marginBottom: '0.4rem',
            fontSize: 'var(--bobr-text-sm)',
            fontWeight: 'var(--bobr-weight-medium)',
            color: 'var(--bobr-fg)',
          }}
        >
          {t('profile.language')}
        </span>
        <div style={{ display: 'flex', gap: '0.75rem' }} data-testid="profile-language">
          {(['PL', 'EN'] as const).map((option) => (
            <label
              key={option}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.6rem 1rem',
                cursor: 'pointer',
                borderRadius: 'var(--bobr-radius-control)',
                border: `1px solid ${locale === option ? 'var(--bobr-accent)' : 'var(--bobr-border)'}`,
                fontSize: 'var(--bobr-text-sm)',
              }}
            >
              <input
                type="radio"
                name="locale"
                value={option}
                checked={locale === option}
                onChange={() => {
                  setLocaleEdit(option);
                  setSaved(false);
                }}
              />
              {t(`profile.language${option}`)}
            </label>
          ))}
        </div>
      </div>

      <p
        className="bobr-aform__status"
        role="status"
        aria-live="polite"
        data-tone={saved ? 'ok' : apiMessage ? 'error' : undefined}
        data-testid="profile-details-status"
      >
        {apiMessage ?? (saved ? t('profile.detailsSaved') : '')}
      </p>
      <div className="bobr-aaction">
        <Button type="submit">{update.isPending ? t('profile.submitting') : t('profile.detailsSubmit')}</Button>
      </div>
    </form>
  );
}

const PROBLEM_KEY: Record<PasswordChangeProblem | PasswordChangeFailure, string> = {
  current: 'profile.errCurrent',
  tooShort: 'profile.errTooShort',
  tooLong: 'profile.errTooLong',
  mismatch: 'profile.errMismatch',
  same: 'profile.errSame',
  wrongCurrent: 'profile.errWrongCurrent',
  signedOut: 'signedOutBody',
  generic: 'profile.errGeneric',
};

function ChangePasswordForm() {
  const t = useTranslations('account');
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<PasswordChangeProblem | PasswordChangeFailure | null>(null);
  const [done, setDone] = useState(false);

  const message = problem ? t(PROBLEM_KEY[problem], { min: PASSWORD_MIN, max: PASSWORD_MAX }) : null;

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setDone(false);
    const invalid = validatePasswordChange({ current, next, confirm });
    if (invalid) {
      setProblem(invalid);
      return;
    }
    setProblem(null);
    setBusy(true);
    try {
      const result = await authClient.changePassword({
        currentPassword: current,
        newPassword: next,
        // Anyone else holding this account's session is signed out; this
        // browser gets a fresh session and stays in.
        revokeOtherSessions: true,
      });
      if (result.error) {
        setProblem(classifyPasswordChangeError(result.error));
        return;
      }
      setCurrent('');
      setNext('');
      setConfirm('');
      setDone(true);
    } catch {
      setProblem('generic');
    } finally {
      setBusy(false);
    }
  }

  const fieldError = (keys: (PasswordChangeProblem | PasswordChangeFailure)[]) =>
    problem && keys.includes(problem) ? message ?? undefined : undefined;

  return (
    <form className="bobr-acard bobr-aform" onSubmit={submit} noValidate data-testid="password-form">
      <div>
        <h3 className="bobr-acard__title">{t('profile.passwordTitle')}</h3>
        <p className="bobr-acard__body" style={{ marginTop: '0.375rem' }}>
          {t('profile.passwordBody')}
        </p>
      </div>
      <Field
        label={t('profile.current')}
        type="password"
        name="current-password"
        autoComplete="current-password"
        value={current}
        onChange={(e) => setCurrent(e.target.value)}
        error={fieldError(['current', 'wrongCurrent'])}
      />
      <Field
        label={t('profile.new')}
        type="password"
        name="new-password"
        autoComplete="new-password"
        value={next}
        onChange={(e) => setNext(e.target.value)}
        hint={t('profile.newHint', { min: PASSWORD_MIN })}
        error={fieldError(['tooShort', 'tooLong', 'same'])}
      />
      <Field
        label={t('profile.confirm')}
        type="password"
        name="confirm-password"
        autoComplete="new-password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        error={fieldError(['mismatch'])}
      />
      <p
        className="bobr-aform__status"
        role="status"
        aria-live="polite"
        data-tone={done ? 'ok' : problem ? 'error' : undefined}
        data-testid="password-status"
      >
        {done ? t('profile.changed') : problem === 'signedOut' || problem === 'generic' ? message : null}
      </p>
      <div className="bobr-aaction">
        <Button type="submit">{busy ? t('profile.submitting') : t('profile.submit')}</Button>
      </div>
    </form>
  );
}
