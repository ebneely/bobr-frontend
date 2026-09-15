import {
  classifyPasswordChangeError,
  PASSWORD_MAX,
  validatePasswordChange,
} from '@/lib/api/password';

describe('validatePasswordChange', () => {
  const ok = { current: 'old-password-1', next: 'new-password-1', confirm: 'new-password-1' };

  it('accepts a valid change', () => {
    expect(validatePasswordChange(ok)).toBeNull();
  });

  it('reports the first problem in field order', () => {
    expect(validatePasswordChange({ ...ok, current: '' })).toBe('current');
    expect(validatePasswordChange({ ...ok, next: 'short', confirm: 'short' })).toBe('tooShort');
    const long = 'x'.repeat(PASSWORD_MAX + 1);
    expect(validatePasswordChange({ ...ok, next: long, confirm: long })).toBe('tooLong');
    expect(validatePasswordChange({ ...ok, confirm: 'different-1' })).toBe('mismatch');
    expect(validatePasswordChange({ current: 'same-pass-1', next: 'same-pass-1', confirm: 'same-pass-1' })).toBe('same');
  });

  it('allows exactly the minimum length', () => {
    expect(validatePasswordChange({ current: 'a', next: '12345678', confirm: '12345678' })).toBeNull();
  });
});

describe('classifyPasswordChangeError', () => {
  it('maps better-auth codes', () => {
    expect(classifyPasswordChangeError({ code: 'INVALID_PASSWORD', status: 400 })).toBe('wrongCurrent');
    expect(classifyPasswordChangeError({ code: 'PASSWORD_TOO_SHORT', status: 400 })).toBe('tooShort');
    expect(classifyPasswordChangeError({ code: 'PASSWORD_TOO_LONG', status: 400 })).toBe('tooLong');
  });

  it('treats a missing session as signed out and anything else as generic', () => {
    expect(classifyPasswordChangeError({ status: 401 })).toBe('signedOut');
    expect(classifyPasswordChangeError({ code: 'SOMETHING', status: 500 })).toBe('generic');
    expect(classifyPasswordChangeError(null)).toBe('generic');
  });
});
