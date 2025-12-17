import { normalizePrivateKey } from '../../src/util/normalizePrivateKey';

describe('normalizePrivateKey', () => {
  describe('valid inputs', () => {
    it('should return key unchanged if it already has 0x prefix', () => {
      const key = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      const result = normalizePrivateKey(key);
      expect(result).toBe(key);
    });

    it('should return key unchanged with 0X uppercase prefix', () => {
      const key = '0X1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      const result = normalizePrivateKey(key);
      expect(result).toBe(key);
    });

    it('should add 0x prefix if missing', () => {
      const key = '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      const result = normalizePrivateKey(key);
      expect(result).toBe(`0x${key}`);
    });

    it('should handle lowercase hex characters', () => {
      const key = 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
      const result = normalizePrivateKey(key);
      expect(result).toBe(`0x${key}`);
    });

    it('should handle uppercase hex characters', () => {
      const key = 'ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890';
      const result = normalizePrivateKey(key);
      expect(result).toBe(`0x${key}`);
    });

    it('should handle mixed case hex characters', () => {
      const key = 'AbCdEf1234567890aBcDeF1234567890AbCdEf1234567890aBcDeF1234567890';
      const result = normalizePrivateKey(key);
      expect(result).toBe(`0x${key}`);
    });
  });

  describe('whitespace handling', () => {
    it('should trim leading whitespace', () => {
      const key = '  0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      const result = normalizePrivateKey(key);
      expect(result).toBe('0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef');
    });

    it('should trim trailing whitespace', () => {
      const key = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef  ';
      const result = normalizePrivateKey(key);
      expect(result).toBe('0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef');
    });

    it('should trim both leading and trailing whitespace', () => {
      const key = '  0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef  ';
      const result = normalizePrivateKey(key);
      expect(result).toBe('0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef');
    });

    it('should add prefix after trimming for key without 0x', () => {
      const key = '  1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef  ';
      const result = normalizePrivateKey(key);
      expect(result).toBe('0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef');
    });

    it('should handle newline characters', () => {
      const key = '\n0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef\n';
      const result = normalizePrivateKey(key);
      expect(result).toBe('0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef');
    });

    it('should handle tab characters', () => {
      const key = '\t0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef\t';
      const result = normalizePrivateKey(key);
      expect(result).toBe('0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef');
    });
  });

  describe('error handling', () => {
    it('should throw error for empty string', () => {
      expect(() => normalizePrivateKey('')).toThrow('Private key is required');
    });

    it('should throw error for whitespace-only string', () => {
      expect(() => normalizePrivateKey('   ')).toThrow('Private key is required');
    });

    it('should throw error for just 0x', () => {
      expect(() => normalizePrivateKey('0x')).toThrow('Private key is required');
    });

    it('should throw error for just 0X (uppercase)', () => {
      expect(() => normalizePrivateKey('0X')).toThrow('Private key is required');
    });

    it('should throw error for 0x with whitespace', () => {
      expect(() => normalizePrivateKey('  0x  ')).toThrow('Private key is required');
    });

    it('should throw error for undefined-like input', () => {
      expect(() => normalizePrivateKey(undefined as any)).toThrow('Private key is required');
    });

    it('should throw error for null-like input', () => {
      expect(() => normalizePrivateKey(null as any)).toThrow('Private key is required');
    });
  });

  describe('edge cases', () => {
    it('should handle short keys (non-standard length)', () => {
      const key = 'abcd';
      const result = normalizePrivateKey(key);
      expect(result).toBe('0xabcd');
    });

    it('should handle very long keys', () => {
      const key = 'a'.repeat(100);
      const result = normalizePrivateKey(key);
      expect(result).toBe(`0x${'a'.repeat(100)}`);
    });

    it('should preserve case of the key value', () => {
      const key = '0xABCDEF';
      const result = normalizePrivateKey(key);
      expect(result).toBe('0xABCDEF');
    });

    it('should handle key starting with 0 (not 0x)', () => {
      const key = '01234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      const result = normalizePrivateKey(key);
      expect(result).toBe(`0x${key}`);
    });
  });
});
