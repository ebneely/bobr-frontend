'use client';

import { createAuthClient } from 'better-auth/react';

const API_ORIGIN = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8003';

/**
 * The better-auth browser client.
 *
 * `baseURL` carries the full auth path, not just the origin. The client
 * defaults to `/api/auth`, while our server mounts at `/v1/auth` (it sits under
 * the API's global `v1` prefix) — leave the default in place and every call
 * 404s against a route that looks correctly mounted on the server.
 *
 * `credentials: 'include'` is required because the storefront and the API are
 * different origins in development (3100 and 8003). Without it the browser
 * sends no cookie and accepts no Set-Cookie, so sign-in appears to succeed and
 * the very next request is anonymous.
 */
export const authClient = createAuthClient({
  baseURL: `${API_ORIGIN}/v1/auth`,
  fetchOptions: {
    credentials: 'include',
  },
});

/**
 * CONSTRAINT, learned twice here — do not attempt a third variant.
 *
 * This client can only ever send better-auth's BUILT-IN sign-up fields. The
 * server's `additionalFields` (role, locale) cannot be reached from this repo:
 *
 *  - passing one directly is a type error, because the client types the call
 *    from its own built-ins;
 *  - and `inferAdditionalFields({...})` does not fix it — declaring the fields
 *    makes them REQUIRED, so omitting them then fails too. It is meant to be
 *    used as `inferAdditionalFields<typeof auth>()`, inferring from the SERVER's
 *    auth instance, which lives in a different repository.
 *
 * So: send only email, password and name. Anything else about the user is set
 * by a separate authenticated request after sign-up. Widening these types needs
 * the server's type published as a shared package — that is the real fix, and
 * it is not worth a package for two fields.
 */

export const { signIn, signUp, signOut, useSession } = authClient;
