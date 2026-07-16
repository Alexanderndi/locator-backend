import { isValidPhone, normalizePhone } from './phone.util';

describe('phone.util', () => {
  describe('normalizePhone', () => {
    it('normalizes Nigeria local numbers', () => {
      expect(normalizePhone('08012345678')).toBe('+2348012345678');
    });

    it('preserves international format', () => {
      expect(normalizePhone('+44 7911 123456')).toBe('+447911123456');
    });

    it('normalizes numbers starting with 234', () => {
      expect(normalizePhone('2348012345678')).toBe('+2348012345678');
    });
  });

  describe('isValidPhone', () => {
    it('accepts E.164 numbers', () => {
      expect(isValidPhone('+2348012345678')).toBe(true);
    });

    it('rejects too-short numbers', () => {
      expect(isValidPhone('+1234')).toBe(false);
    });
  });
});
