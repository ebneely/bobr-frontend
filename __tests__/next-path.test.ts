import { afterRegisterPath, safeNextPath } from '@/lib/auth/next-path';

describe('safeNextPath', () => {
  it('accepts a local page in either locale', () => {
    expect(safeNextPath('/pl/consultation')).toBe('/pl/consultation');
    expect(safeNextPath('/en/order')).toBe('/en/order');
    expect(safeNextPath('/pl')).toBe('/pl');
  });

  it.each([
    ['nothing', null],
    ['empty', ''],
    ['another site', 'https://evil.com/pl/consultation'],
    ['protocol-relative', '//evil.com'],
    ['a doubled slash inside', '/pl//evil.com'],
    ['a backslash', '/pl\\evil.com'],
    ['no locale', '/consultation'],
    ['an unknown locale', '/de/consultation'],
    ['a locale prefix of another word', '/plx/consultation'],
    ['a javascript url', 'javascript:alert(1)'],
    ['an encoded escape', '/pl/%2F%2Fevil.com'],
    ['a dot segment', '/pl/../../evil'],
  ])('refuses %s', (_label, value) => {
    expect(safeNextPath(value)).toBeNull();
  });
});

describe('safeNextPath with a query', () => {
  it('keeps a plain query so ?meal= survives login', () => {
    expect(safeNextPath('/pl/order?meal=9133f6cc-54f5-4e68-a528-519007963cc3')).toBe(
      '/pl/order?meal=9133f6cc-54f5-4e68-a528-519007963cc3',
    );
    expect(safeNextPath('/pl/intake?next=%2Fpl%2Forder')).toBe('/pl/intake?next=%2Fpl%2Forder');
  });

  it.each([
    ['a slash in the query', '/pl/order?next=//evil.com'],
    ['a fragment', '/pl/order#x'],
    ['a second question mark', '/pl/order??x'],
    ['a query without a locale', '/order?meal=1'],
  ])('refuses %s', (_label, value) => {
    expect(safeNextPath(value)).toBeNull();
  });
});

describe('afterRegisterPath', () => {
  it('sends a new account to the intake when there is nowhere else to go', () => {
    expect(afterRegisterPath('pl', null)).toBe('/pl/intake');
  });

  it('routes the way to ordering through the intake, carrying the order page', () => {
    expect(afterRegisterPath('pl', '/pl/order')).toBe('/pl/intake?next=%2Fpl%2Forder');
    expect(afterRegisterPath('en', '/en/order?meal=abc')).toBe('/en/intake?next=%2Fen%2Forder%3Fmeal%3Dabc');
  });

  it('returns straight to anything else', () => {
    expect(afterRegisterPath('pl', '/pl/consultation')).toBe('/pl/consultation');
    expect(afterRegisterPath('pl', '/pl/orderly')).toBe('/pl/orderly');
  });
});
