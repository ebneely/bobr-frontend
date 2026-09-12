import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./lib/i18n/request.ts');

const isProd = process.env.NODE_ENV === 'production';

/**
 * Whether this deployment is genuinely reachable over HTTPS.
 *
 * A plain env var, NOT a NEXT_PUBLIC_ one: those are inlined at build time, so
 * a public flag could not be changed by restarting the server. This is read
 * when next.config is loaded at server start, which is what makes it a deploy
 * setting rather than a build setting.
 *
 * It gates the two headers that BREAK a plain-http deployment:
 * upgrade-insecure-requests rewrites every http:// request to https://, and
 * HSTS pins the browser to https for months after a single visit.
 */
const httpsEnabled = process.env.HTTPS_ENABLED === 'true';

/**
 * The API origin, as a CSP source.
 *
 * Meal photos are served BY THE API, not by this app. `img-src 'self'` does not
 * cover another origin, and the blanket `https:` below does not cover an
 * http-only backend — which is exactly the deployment this project targets. The
 * failure is silent: the browser blocks the request, the card renders without a
 * picture, and nothing but the console says why.
 *
 * Derived from the variable the client actually fetches from, so the allowance
 * cannot drift from the origin in use.
 */
const apiOrigin = (() => {
  const raw = process.env.NEXT_PUBLIC_API_URL;
  if (!raw) return null;
  try {
    return new URL(raw).origin;
  } catch {
    // A malformed value must not take the whole config down at boot.
    return null;
  }
})();

// script-src still allows 'unsafe-inline' because the App Router injects inline
// hydration scripts. Dev adds 'unsafe-eval' + ws/http so HMR keeps working.
const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  `script-src 'self' 'unsafe-inline'${isProd ? '' : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: https:${apiOrigin ? ` ${apiOrigin}` : ''}`,
  "font-src 'self' data:",
  // http: stays allowed whenever HTTPS is not in play — the API lives on
  // another subdomain, and over plain http every call to it is 'http:'.
  `connect-src 'self' https:${isProd && httpsEnabled ? '' : ' ws: wss: http:'}`,
  // Only when HTTPS actually exists. This directive rewrites every http://
  // request to https://, so on an http-only host it breaks every asset and
  // every API call with no useful error.
  ...(httpsEnabled ? ['upgrade-insecure-requests'] : []),
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: contentSecurityPolicy },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()',
  },
  // HSTS only when HTTPS genuinely exists, not merely in production.
  //
  // Sent from an http-only host it is ignored today — but the moment that host
  // is reachable over https once, the browser pins https for two years and
  // `includeSubDomains` drags every subdomain with it. Undoing that on a
  // machine that already saw the header is not something you can do from the
  // server.
  ...(isProd && httpsEnabled
    ? [
        {
          key: 'Strict-Transport-Security',
          value: 'max-age=63072000; includeSubDomains; preload',
        },
      ]
    : []),
];

const nextConfig: NextConfig = {
  output: 'standalone',
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default withNextIntl(nextConfig);
