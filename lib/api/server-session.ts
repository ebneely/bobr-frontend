// Server components only: `next/headers` throws if this is ever bundled for
// the browser, which is the guard (the `server-only` package is not installed).
import { cache } from 'react';
import { cookies } from 'next/headers';

import { redirect } from '@/lib/i18n/navigation';

/**
 * The session, read on the server for the account area's route gate.
 *
 * Asks the API's own `get-session` with the visitor's cookie rather than
 * decoding anything locally: the API is the only thing that knows whether a
 * session is still valid. Called from the server, so it goes straight to the
 * upstream (API_UPSTREAM_URL) instead of back through this app's /v1 proxy.
 *
 * `cache` dedupes it across the layout and the page of one request.
 */

export interface ServerSessionUser {
  id: string;
  name: string | null;
  email: string;
  role: string;
}

export type ServerSession =
  | { state: 'signedIn'; user: ServerSessionUser }
  | { state: 'signedOut' }
  /** The API could not be asked. Not treated as signed out — see requireAccount. */
  | { state: 'unknown' };

function apiOrigin(): string {
  return (
    process.env.API_UPSTREAM_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8003'
  ).replace(/\/+$/, '');
}

export const getServerSession = cache(async (): Promise<ServerSession> => {
  const cookieHeader = (await cookies()).toString();
  if (!cookieHeader) return { state: 'signedOut' };

  try {
    const res = await fetch(`${apiOrigin()}/v1/auth/get-session`, {
      headers: { cookie: cookieHeader },
      cache: 'no-store',
    });
    if (res.status === 401) return { state: 'signedOut' };
    if (!res.ok) return { state: 'unknown' };
    const body = (await res.json().catch(() => null)) as {
      user?: { id: string; name?: string | null; email: string; role?: string };
    } | null;
    if (!body?.user) return { state: 'signedOut' };
    return {
      state: 'signedIn',
      user: {
        id: body.user.id,
        name: body.user.name ?? null,
        email: body.user.email,
        role: body.user.role ?? 'CUSTOMER',
      },
    };
  } catch {
    return { state: 'unknown' };
  }
});

/**
 * Sends a signed-out visitor to log in, with this page as `next`.
 *
 * `path` is the page WITHOUT the locale (`/account/orders`); `next` gets the
 * locale prefix the login page's validator expects. An API that cannot be
 * reached does not redirect — that would bounce a signed-in customer to a
 * login form during an outage; the page renders and its queries show the error.
 */
export async function requireAccount(locale: string, path: string): Promise<ServerSession> {
  const session = await getServerSession();
  if (session.state === 'signedOut') {
    redirect({ href: { pathname: '/login', query: { next: `/${locale}${path}` } }, locale });
  }
  return session;
}
