'use client';

import { useState, type FormEvent } from 'react';
import { useTranslations } from 'next-intl';

import { signIn } from '@/lib/auth/client';
import { Field } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { Link } from '@/lib/i18n/navigation';
import { DASHBOARD_URL } from '@/lib/auth/urls';

export function LoginClient() {
  const t = useTranslations('auth');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setBusy(true);

    const result = await signIn.email({ email, password });

    if (result.error) {
      // Deliberately the same message whether the address is unknown or the
      // password is wrong. Distinguishing them tells an attacker which
      // addresses have accounts.
      setError(result.error.status === 401 ? t('errorInvalid') : t('errorGeneric'));
      setBusy(false);
      return;
    }

    // A full navigation, not a client-side push: the dashboard is a separate
    // app on its own origin, and its server layout has to read the new session
    // cookie on a real request.
    window.location.assign(DASHBOARD_URL);
  }

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
    >
      <Field
        label={t('email')}
        type="email"
        name="email"
        autoComplete="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <Field
        label={t('password')}
        type="password"
        name="password"
        autoComplete="current-password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      {/* aria-live so the failure is announced when it appears, rather than
          being a red paragraph a screen-reader user never learns about. */}
      <p
        role="status"
        aria-live="polite"
        style={{
          minHeight: '1.2em',
          fontSize: 'var(--bobr-text-sm)',
          color: 'var(--bobr-danger)',
        }}
      >
        {error}
      </p>

      <Button type="submit">{busy ? t('working') : t('submitLogin')}</Button>

      <p
        style={{
          fontSize: 'var(--bobr-text-sm)',
          color: 'var(--bobr-fg-muted)',
        }}
      >
        {t('noAccount')}{' '}
        <Link href="/register" className="bobr-navlink">
          {t('submitRegister')}
        </Link>
      </p>
    </form>
  );
}
