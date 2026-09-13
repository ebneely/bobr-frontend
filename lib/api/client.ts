/**
 * The one way this app talks to bobr_backend.
 *
 * Deliberately a hand-written fetch wrapper rather than axios: the only things
 * we need on top of fetch are a base URL, credentialed cookies and a single
 * error shape, and all three are a few lines each.
 */

const BASE_URL = `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8003'}/v1`;

/** ICU params the backend attaches to a code, e.g. `{ maxMb: 10 }`. */
export type ApiErrorParams = Record<string, string | number>;

/**
 * One validation failure. `issue` is English, for logs; `code` is the stable
 * key a front end translates. Optional so an older backend still type-checks.
 */
export interface FieldIssue {
  field: string;
  issue: string;
  code?: string;
  params?: ApiErrorParams;
}

/** The error body every backend failure arrives in — see the backend's HttpExceptionFilter. */
export interface ApiErrorBody {
  statusCode: number;
  /** English, unchanged — the fallback whenever a code cannot be translated. */
  message: string | string[] | FieldIssue[];
  error: string;
  /** Stable, translatable error code (ebneely/bobr-backend#21). */
  code?: string;
  params?: ApiErrorParams;
  traceId?: string;
  path?: string;
  timestamp?: string;
}

export class ApiError extends Error {
  readonly status: number;
  readonly body: ApiErrorBody | null;
  /** Quote this in a bug report — it finds the exact server log line. */
  readonly traceId?: string;

  constructor(status: number, body: ApiErrorBody | null) {
    super(formatApiError(body) || `Request failed with status ${status}`);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
    this.traceId = body?.traceId;
  }
}

/**
 * Turns a backend error code into a localised string, or null when this client
 * has no string for it. `'field:<path>'` asks for a field's label instead. See
 * `lib/api/use-api-error.ts` for the next-intl implementation.
 */
export type ApiErrorTranslate = (code: string, params?: ApiErrorParams) => string | null;

/**
 * The backend's `message` is a string, a string[], or a `{field, issue}[]` for
 * validation failures. Callers that just want something to show a user should
 * use this rather than each re-deriving the three cases.
 *
 * With `translate`, codes are shown in the page's language; anything this
 * client does not know falls back to the English `message` — never a blank and
 * never a raw key.
 */
export function formatApiError(
  body: ApiErrorBody | null | undefined,
  translate?: ApiErrorTranslate,
): string {
  if (!body) return '';
  const { message } = body;

  const fieldItems =
    Array.isArray(message) && message.some((m) => typeof m !== 'string');

  if (!fieldItems && translate && body.code) {
    const translated = translate(body.code, body.params);
    if (translated) return translated;
  }

  if (typeof message === 'string') return message;
  if (!Array.isArray(message)) return '';

  return (message as Array<string | FieldIssue>)
    .map((m) => {
      if (typeof m === 'string') return m;
      const issue = translate && m.code ? translate(m.code, m.params) : null;
      if (!issue) return `${m.field}: ${m.issue}`;
      const label = translate?.(`field:${m.field}`, undefined);
      return label ? `${label}: ${issue}` : issue;
    })
    .join('\n');
}

export interface ApiFetchOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  /** Send the session cookie. Defaults to true. */
  auth?: boolean;
}

export async function apiFetch<T>(
  path: string,
  { body, auth = true, headers, ...init }: ApiFetchOptions = {},
): Promise<T> {
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;

  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    // Auth is an httpOnly cookie, so it rides along on its own — there is no
    // token in JS to attach, which is the point.
    credentials: auth ? 'include' : 'omit',
    headers: {
      // Never set Content-Type on FormData: the browser has to add its own
      // multipart boundary, and overriding it makes the request unparseable
      // on the server with no useful error.
      ...(isFormData || body === undefined
        ? {}
        : { 'Content-Type': 'application/json' }),
      ...headers,
    },
    body: isFormData ? (body as FormData) : body === undefined ? undefined : JSON.stringify(body),
  });

  if (res.status === 204) return undefined as T;

  const payload = await res.json().catch(() => null);

  if (!res.ok) throw new ApiError(res.status, payload as ApiErrorBody | null);

  return payload as T;
}
