'use client';

import { useState, type FormEvent } from 'react';
import { useTranslations } from 'next-intl';

import { signUp } from '@/lib/auth/client';
import { Field } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { Link } from '@/lib/i18n/navigation';

const MIN_PASSWORD = 8;

export function RegisterClient({ next }: { next: string | null }) {
  const t = useTranslations('auth');

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    // Checked here as well as on the server. This one is purely so the person
    // finds out before a round trip — the server's minimum is the real rule.
    if (password.length < MIN_PASSWORD) {
      setPasswordError(t('passwordHint'));
      return;
    }
    setPasswordError(null);
    setBusy(true);

    const result = await signUp.email({
      email,
      password,
      // better-auth requires `name`; the server maps it onto User.fullName.
      name: fullName,
    });

    // KNOWN GAP: the locale they registered in is not sent. better-auth's
    // client types sign-up from its own built-in fields, and widening them
    // needs the SERVER's auth type imported into this app — which is a
    // different repo. So the server's default (PL) wins, and someone who
    // registers in English is stored as Polish.
    //
    // Harmless today because nothing reads User.locale yet; it becomes wrong
    // the moment we send email. Fix then by PATCHing the profile straight
    // after sign-up, which needs no type sharing.

    if (result.error) {
      // 422 is better-auth's "that address is taken". Unlike sign-in, saying so
      // here leaks nothing: anyone can discover it by trying to register.
      setError(
        result.error.status === 422 ? t('errorTaken') : t('errorGeneric'),
      );
      setBusy(false);
      return;
    }

    // autoSignIn is on, so the session cookie is already set. Full navigation,
    // so server components re-render signed in. Never the dashboard — it is
    // hidden from the storefront (owner, 2026-09-14).
    // Back to the page that sent them here when there is one; `next` is
    // validated as a local path on the server before it arrives.
    window.location.assign(next ?? '/');
  }

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
    >
      <Field
        label={t('fullName')}
        name="name"
        autoComplete="name"
        required
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
      />

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
        autoComplete="new-password"
        required
        minLength={MIN_PASSWORD}
        hint={t('passwordHint')}
        error={passwordError ?? undefined}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

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

      <Button type="submit">{busy ? t('working') : t('submitRegister')}</Button>

      <p
        style={{
          fontSize: 'var(--bobr-text-sm)',
          color: 'var(--bobr-fg-muted)',
        }}
      >
        {t('hasAccount')}{' '}
        <Link
          href={next ? { pathname: '/login', query: { next } } : '/login'}
          className="bobr-navlink"
        >
          {t('submitLogin')}
        </Link>
      </p>
    </form>
  );
}
