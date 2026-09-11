import { formatApiError } from '@/lib/api/client';

describe('formatApiError', () => {
  it('passes a plain string message through', () => {
    expect(
      formatApiError({ statusCode: 400, message: 'Bad thing', error: 'Bad Request' }),
    ).toBe('Bad thing');
  });

  it('joins a string array', () => {
    expect(
      formatApiError({
        statusCode: 422,
        message: ['weight must be a number', 'height should not be empty'],
        error: 'Unprocessable Entity',
      }),
    ).toBe('weight must be a number\nheight should not be empty');
  });

  it('renders zod field issues as field: issue', () => {
    expect(
      formatApiError({
        statusCode: 400,
        message: [{ field: 'weightKg', issue: 'Required' }],
        error: 'Bad Request',
      }),
    ).toBe('weightKg: Required');
  });

  it('returns an empty string for a missing body', () => {
    expect(formatApiError(null)).toBe('');
  });
});
