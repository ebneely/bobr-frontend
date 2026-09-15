/**
 * Where to send someone after they sign in or register, if the page that sent
 * them to log in asked to be returned to.
 *
 * Only a local page in one of our locales is accepted. Anything else — another
 * host, a protocol-relative `//host`, a backslash (browsers treat `/\host` as a
 * host), an encoded or dot-segment escape, a `javascript:` URL — returns null
 * and the caller falls back to the dashboard. An unchecked `?next=` is an open
 * redirect: a login link on our domain that lands on someone else's.
 *
 * A query string is allowed so `/pl/order?meal=<id>` survives the round trip
 * through login, but only of characters that cannot change the path: no slash,
 * no backslash, no `#`, no second `?`. A percent-escape in a query value is
 * inert — the path in front of it is already fixed.
 */
const LOCAL_PAGE = /^\/(pl|en)(\/[A-Za-z0-9_-]+)*\/?(\?[A-Za-z0-9_=&%.-]*)?$/;

export function safeNextPath(raw: string | null | undefined): string | null {
  if (!raw) return null;
  return LOCAL_PAGE.test(raw) ? raw : null;
}

/** True for the order page itself, with or without a query. */
function isOrderPath(path: string, locale: string): boolean {
  return path === `/${locale}/order` || path.startsWith(`/${locale}/order?`);
}

/**
 * Where a brand-new account goes (G05). A new account has no intake profile,
 * and ordering refuses without one, so a visitor who registered on the way to
 * ordering goes through the intake first and is then handed back to the order.
 * Registering for anything else (a consultation) returns them there directly;
 * with no `next` at all, the intake is the next step.
 */
export function afterRegisterPath(locale: string, next: string | null): string {
  const intake = `/${locale}/intake`;
  if (!next) return intake;
  if (isOrderPath(next, locale)) return `${intake}?next=${encodeURIComponent(next)}`;
  return next;
}
