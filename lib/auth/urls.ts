/**
 * Where to send someone once they are signed in.
 *
 * The dashboard is a separate Next app on its own origin, so this is an
 * absolute URL rather than a route. It is read at module load, which is fine
 * because NEXT_PUBLIC_* values are inlined at build time anyway.
 */
export const DASHBOARD_URL =
  process.env.NEXT_PUBLIC_DASHBOARD_URL ?? 'http://localhost:3101';
