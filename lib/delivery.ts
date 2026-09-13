/**
 * Delivery-address and BLIK display helpers.
 *
 * Pure functions, so the rules the storefront applies before talking to the
 * server are unit-tested rather than trusted. The server re-validates all of
 * them; these exist only to give the customer an answer before a round trip.
 */

/** A complete Polish postal code: two digits, a dash, three digits. */
export const POSTAL_CODE_PATTERN = /^\d{2}-\d{3}$/;

/** The server's limits on `delivery` (bobr-backend#14). */
export const ADDRESS_LINE_MIN = 3;
export const ADDRESS_LINE_MAX = 200;
export const CITY_MIN = 2;
export const CITY_MAX = 100;

/**
 * Normalises what someone typed into a postal code as they type it: digits
 * only, at most five, with the dash put in once a third digit arrives. Typing
 * "00950" and pasting "00-950" both end up as "00-950".
 */
export function formatPostalCodeInput(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 5);
  return digits.length > 2 ? `${digits.slice(0, 2)}-${digits.slice(2)}` : digits;
}

export function isCompletePostalCode(value: string): boolean {
  return POSTAL_CODE_PATTERN.test(value);
}

export type AddressField = 'addressLine' | 'city' | 'postalCode';

export interface AddressInput {
  addressLine: string;
  city: string;
  postalCode: string;
}

/**
 * Which address fields are missing or malformed, as a map of field → problem.
 * Empty when the address may be sent. Lengths are counted on trimmed values,
 * which is what gets sent.
 */
export function validateAddress(
  input: AddressInput,
): Partial<Record<AddressField, 'required' | 'tooShort' | 'tooLong' | 'format'>> {
  const errors: Partial<Record<AddressField, 'required' | 'tooShort' | 'tooLong' | 'format'>> = {};
  const line = input.addressLine.trim();
  const city = input.city.trim();
  const code = input.postalCode.trim();

  if (!line) errors.addressLine = 'required';
  else if (line.length < ADDRESS_LINE_MIN) errors.addressLine = 'tooShort';
  else if (line.length > ADDRESS_LINE_MAX) errors.addressLine = 'tooLong';

  if (!city) errors.city = 'required';
  else if (city.length < CITY_MIN) errors.city = 'tooShort';
  else if (city.length > CITY_MAX) errors.city = 'tooLong';

  if (!code) errors.postalCode = 'required';
  else if (!isCompletePostalCode(code)) errors.postalCode = 'format';

  return errors;
}

/**
 * "+48600123456" → "+48 600 123 456". The server stores the number normalised
 * to +48 and nine digits; anything else is shown as it came rather than
 * guessed at, so a surprise value is visible instead of silently mangled.
 */
export function formatBlikPhone(stored: string): string {
  const match = /^\+48(\d{3})(\d{3})(\d{3})$/.exec(stored);
  return match ? `+48 ${match[1]} ${match[2]} ${match[3]}` : stored;
}
