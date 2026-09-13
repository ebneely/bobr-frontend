/**
 * Where to send someone after they sign in or register, if the page that sent
 * them to log in asked to be returned to.
 *
 * Only a local page in one of our locales is accepted. Anything else — another
 * host, a protocol-relative `//host`, a backslash (browsers treat `/\host` as a
 * host), an encoded or dot-segment escape, a `javascript:` URL — returns null
 * and the caller falls back to the dashboard. An unchecked `?next=` is an open
 * redirect: a login link on our domain that lands on someone else's.
 */
const LOCAL_PAGE = /^\/(pl|en)(\/[A-Za-z0-9_-]+)*\/?$/;

export function safeNextPath(raw: string | null | undefined): string | null {
  if (!raw) return null;
  return LOCAL_PAGE.test(raw) ? raw : null;
}
