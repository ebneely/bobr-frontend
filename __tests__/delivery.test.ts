import {
  formatBlikPhone,
  formatPostalCodeInput,
  isCompletePostalCode,
  validateAddress,
} from '@/lib/delivery';

describe('postal code input', () => {
  it('inserts the dash once a third digit is typed', () => {
    expect(formatPostalCodeInput('0')).toBe('0');
    expect(formatPostalCodeInput('00')).toBe('00');
    expect(formatPostalCodeInput('009')).toBe('00-9');
    expect(formatPostalCodeInput('00950')).toBe('00-950');
  });

  it('keeps a pasted code with its dash, drops everything that is not a digit', () => {
    expect(formatPostalCodeInput('00-950')).toBe('00-950');
    expect(formatPostalCodeInput(' 80 - 001 ')).toBe('80-001');
    expect(formatPostalCodeInput('ab12c')).toBe('12');
  });

  it('stops at five digits', () => {
    expect(formatPostalCodeInput('009501234')).toBe('00-950');
  });

  it('lets a backspace through the dash', () => {
    // "00-9" with the 9 deleted leaves "00-", which must not re-grow a dash.
    expect(formatPostalCodeInput('00-')).toBe('00');
  });

  it('only calls NN-NNN complete', () => {
    expect(isCompletePostalCode('00-950')).toBe(true);
    expect(isCompletePostalCode('00950')).toBe(false);
    expect(isCompletePostalCode('00-95')).toBe(false);
  });
});

describe('address validation', () => {
  const good = { addressLine: 'ul. Marszałkowska 1', city: 'Warszawa', postalCode: '00-950' };

  it('passes a complete address', () => {
    expect(validateAddress(good)).toEqual({});
  });

  it('flags every missing field, counting trimmed values', () => {
    expect(validateAddress({ addressLine: '  ', city: '', postalCode: '' })).toEqual({
      addressLine: 'required',
      city: 'required',
      postalCode: 'required',
    });
  });

  it('applies the server limits', () => {
    expect(validateAddress({ ...good, addressLine: 'ul' }).addressLine).toBe('tooShort');
    expect(validateAddress({ ...good, addressLine: 'x'.repeat(201) }).addressLine).toBe('tooLong');
    expect(validateAddress({ ...good, city: 'W' }).city).toBe('tooShort');
    expect(validateAddress({ ...good, city: 'x'.repeat(101) }).city).toBe('tooLong');
    expect(validateAddress({ ...good, postalCode: '00-95' }).postalCode).toBe('format');
  });
});

describe('BLIK phone display', () => {
  it('groups a normalised number in threes', () => {
    expect(formatBlikPhone('+48600123456')).toBe('+48 600 123 456');
  });

  it('shows anything unexpected unchanged rather than mangling it', () => {
    expect(formatBlikPhone('600123456')).toBe('600123456');
  });
});
