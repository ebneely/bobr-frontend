import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./lib/i18n/request.ts');

const isProd = process.env.NODE_ENV === 'production';

/**
 * Refuse to build on Vercel with a missing or local address.
 *
 * NEXT_PUBLIC_* values are inlined into the bundle at BUILD time, and every
 * client module falls back to http://localhost:… when one is unset. So a Vercel
 * build without them does not fail — it ships a site whose browser code calls
 * the visitor's own machine. That happened on 2026-09-13: the dashboard
 * redirected everyone to http://localhost:3100/pl/login and the storefront
 * called http://localhost:8003. Failing the build keeps the previous working
 * deployment live and names the variable to set.
 *
 * Only on Vercel (VERCEL=1): local builds read .env.local, where localhost is
 * exactly right.
 */
const REQUIRED_PUBLIC_URLS: ReadonlyArray<[string, string]> = [
  ['NEXT_PUBLIC_API_URL', 'the BOBR API, e.g. https://api.bobr.pl'],
  ['NEXT_PUBLIC_DASHBOARD_URL', 'the dashboard origin'],
];
if (process.env.VERCEL === '1') {
  const problems = REQUIRED_PUBLIC_URLS.flatMap(([name, what]) => {
    const value = process.env[name];
    if (!value) return [`${name} is not set (${what})`];
    if (/\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(value)) {
      return [`${name} points at ${value} (${what})`];
    }
    return [];
  });
  if (problems.length > 0) {
    throw new Error(
      `Refusing to build: ${problems.join('; ')}. Set it in Vercel → Settings → Environment Variables, then redeploy without the build cache.`,
    );
  }
}

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

const imageOrigins = (() => {
  // Where meal photographs are actually fetched FROM.
  //
  // Not necessarily the API: with imgproxy configured the API hands out URLs on
  // the imgproxy host, and with neither imgproxy nor a bucket it serves the
  // bytes itself at /v1/files. Both are cross-origin to this app, so `'self'`
  // covers neither, and `https:` covers neither on the http-only host this
  // project targets.
  //
  // Getting this wrong fails silently in the one way that matters: the request
  // is blocked, the card draws an empty frame, and nothing but the console says
  // why. So every origin an image can come from is listed here.
  const origins = new Set();
  for (const raw of [process.env.NEXT_PUBLIC_API_URL, process.env.NEXT_PUBLIC_IMAGE_HOST]) {
    if (!raw) continue;
    try {
      origins.add(new URL(raw).origin);
    } catch {
      // A malformed value must not take the whole config down at boot.
    }
  }
  return [...origins];
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
  `img-src 'self' data: blob: https:${imageOrigins.map((o) => ` ${o}`).join('')}`,
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
