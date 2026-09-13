import { formatApiError, type ApiErrorTranslate } from '@/lib/api/client';
import pl from '@/messages/pl.json';

/**
 * A stand-in for `useApiErrorTranslate` over the real Polish catalogue, with a
 * deliberately tiny `{param}` interpolation — ICU itself is next-intl's job.
 */
const translatePl: ApiErrorTranslate = (code, params) => {
  const { codes, fields } = pl.apiErrors as {
    codes: Record<string, string>;
    fields: Record<string, string>;
  };
  const template = code.startsWith('field:')
    ? fields[code.slice('field:'.length).replace(/\./g, '_')]
    : codes[code];
  if (!template) return null;
  return template.replace(/\{(\w+)\}/g, (_, k: string) => String(params?.[k] ?? `{${k}}`));
};

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
    expect(formatApiError(undefined, translatePl)).toBe('');
  });

  describe('with translate', () => {
    it('translates a top-level code', () => {
      expect(
        formatApiError(
          {
            statusCode: 403,
            message: 'Complete your intake profile before ordering',
            error: 'Forbidden',
            code: 'INTAKE_INCOMPLETE',
          },
          translatePl,
        ),
      ).toBe(pl.apiErrors.codes.INTAKE_INCOMPLETE);
    });

    it('hands params to the translate function', () => {
      const translate = jest.fn<string | null, Parameters<ApiErrorTranslate>>(translatePl);
      expect(
        formatApiError(
          {
            statusCode: 400,
            message: 'Photo is larger than 10 MB',
            error: 'Bad Request',
            code: 'PHOTO_TOO_LARGE',
            params: { maxMb: 10 },
          },
          translate,
        ),
      ).toBe('Zdjęcie jest za duże — maksymalnie 10 MB.');
      expect(translate).toHaveBeenCalledWith('PHOTO_TOO_LARGE', { maxMb: 10 });
    });

    it('falls back to the English message for an unknown code', () => {
      expect(
        formatApiError(
          {
            statusCode: 400,
            message: 'Something brand new went wrong',
            error: 'Bad Request',
            code: 'SOMETHING_BRAND_NEW',
          },
          translatePl,
        ),
      ).toBe('Something brand new went wrong');
    });

    it('prefixes a translated field issue with the field label', () => {
      expect(
        formatApiError(
          {
            statusCode: 422,
            message: [
              {
                field: 'delivery.postalCode',
                issue: 'Use a Polish postal code, NN-NNN',
                code: 'POSTAL_CODE_FORMAT',
              },
            ],
            error: 'Unprocessable Entity',
            code: 'VALIDATION_FAILED',
          },
          translatePl,
        ),
      ).toBe('Kod pocztowy: Podaj kod pocztowy w formacie NN-NNN.');
    });

    it('shows only the translated issue when the field has no label', () => {
      expect(
        formatApiError(
          {
            statusCode: 422,
            message: [{ field: 'somethingInternal', issue: 'Required', code: 'REQUIRED' }],
            error: 'Unprocessable Entity',
            code: 'VALIDATION_FAILED',
          },
          translatePl,
        ),
      ).toBe('To pole jest wymagane.');
    });

    it('keeps field: issue for an item whose code is unknown, and joins lines', () => {
      expect(
        formatApiError(
          {
            statusCode: 422,
            message: [
              { field: 'preferredAt', issue: 'Must be in the future', code: 'TIME_IN_PAST' },
              { field: 'note', issue: 'Brand new rule', code: 'BRAND_NEW_RULE' },
            ],
            error: 'Unprocessable Entity',
            code: 'VALIDATION_FAILED',
          },
          translatePl,
        ),
      ).toBe(
        `Termin: ${pl.apiErrors.codes.TIME_IN_PAST}\nnote: Brand new rule`,
      );
    });

    it('leaves an older body without codes unchanged', () => {
      const string = { statusCode: 400, message: 'Bad thing', error: 'Bad Request' };
      const issues = {
        statusCode: 400,
        message: [{ field: 'weightKg', issue: 'Required' }],
        error: 'Bad Request',
      };
      expect(formatApiError(string, translatePl)).toBe(formatApiError(string));
      expect(formatApiError(issues, translatePl)).toBe('weightKg: Required');
    });
  });
});
