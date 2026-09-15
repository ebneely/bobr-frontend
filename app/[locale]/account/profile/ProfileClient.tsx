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
import { authClient } from '@/lib/auth/client';
import { useMyIntake } from '@/lib/hooks/use-account';
import { Link } from '@/lib/i18n/navigation';
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
          <article className="bobr-acard" data-testid="profile-details">
            <h3 className="bobr-acard__title">{t('profile.detailsTitle')}</h3>
            <dl className="bobr-arows">
              <div>
                <dt>{t('profile.name')}</dt>
                <dd data-testid="profile-name">{name?.trim() || t('profile.noName')}</dd>
              </div>
              <div>
                <dt>{t('profile.email')}</dt>
                <dd data-testid="profile-email">{email ?? '—'}</dd>
              </div>
            </dl>
          </article>

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
