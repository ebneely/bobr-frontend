import { safeNextPath } from '@/lib/auth/next-path';

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
