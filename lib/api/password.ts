/**
 * Changing a password from the account page.
 *
 * The limits mirror bobr_backend `better-auth.config.ts`
 * (`emailAndPassword.minPasswordLength` / `maxPasswordLength`). The server
 * enforces them again; these only let the form answer before a round trip.
 */
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 512;

export interface PasswordChangeInput {
  current: string;
  next: string;
  confirm: string;
}

export type PasswordChangeProblem = 'current' | 'tooShort' | 'tooLong' | 'mismatch' | 'same';

/** The first problem with the form, or null when it may be sent. */
export function validatePasswordChange(input: PasswordChangeInput): PasswordChangeProblem | null {
  if (!input.current) return 'current';
  if (input.next.length < PASSWORD_MIN) return 'tooShort';
  if (input.next.length > PASSWORD_MAX) return 'tooLong';
  if (input.next !== input.confirm) return 'mismatch';
  if (input.next === input.current) return 'same';
  return null;
}

export type PasswordChangeFailure = 'wrongCurrent' | 'tooShort' | 'tooLong' | 'signedOut' | 'generic';

/**
 * better-auth answers `changePassword` in its own `{ code, message, status }`
 * error, not the API's HttpExceptionFilter shape (the auth routes are mounted
 * straight through). Its codes are stable strings, mapped here.
 */
export function classifyPasswordChangeError(
  error: { code?: string | null; status?: number | null } | null | undefined,
): PasswordChangeFailure {
  if (!error) return 'generic';
  switch (error.code) {
    case 'INVALID_PASSWORD':
      return 'wrongCurrent';
    case 'PASSWORD_TOO_SHORT':
      return 'tooShort';
    case 'PASSWORD_TOO_LONG':
      return 'tooLong';
  }
  if (error.status === 401) return 'signedOut';
  return 'generic';
}
