import { concatenate } from '../../src/api/encryption/util';

describe('Encryption Utilities', () => {
  describe('concatenate', () => {
    it('should concatenate two Uint8Arrays', () => {
      const array1 = new Uint8Array([1, 2, 3]);
      const array2 = new Uint8Array([4, 5, 6]);

      const result = concatenate([array1, array2]);

      expect(result).toEqual(new Uint8Array([1, 2, 3, 4, 5, 6]));
    });

    it('should concatenate multiple Uint8Arrays', () => {
      const array1 = new Uint8Array([1, 2]);
      const array2 = new Uint8Array([3, 4]);
      const array3 = new Uint8Array([5, 6]);
      const array4 = new Uint8Array([7, 8]);

      const result = concatenate([array1, array2, array3, array4]);

      expect(result).toEqual(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]));
    });

    it('should handle empty arrays', () => {
      const array1 = new Uint8Array([1, 2, 3]);
      const array2 = new Uint8Array([]);
      const array3 = new Uint8Array([4, 5]);

      const result = concatenate([array1, array2, array3]);

      expect(result).toEqual(new Uint8Array([1, 2, 3, 4, 5]));
    });

    it('should handle single array', () => {
      const array1 = new Uint8Array([1, 2, 3, 4, 5]);

      const result = concatenate([array1]);

      expect(result).toEqual(array1);
      expect(result).not.toBe(array1); // Should be a new array
    });

    it('should handle all empty arrays', () => {
      const array1 = new Uint8Array([]);
      const array2 = new Uint8Array([]);

      const result = concatenate([array1, array2]);

      expect(result).toEqual(new Uint8Array([]));
      expect(result).toBeDefined();
      if (result) {
        expect(result.length).toBe(0);
      }
    });

    it('should handle no arrays', () => {
      const result = concatenate([]);

      expect(result).toEqual(new Uint8Array([]));
      expect(result).toBeDefined();
      if (result) {
        expect(result.length).toBe(0);
      }
    });

    it('should preserve byte values correctly', () => {
      const array1 = new Uint8Array([0, 255, 128]);
      const array2 = new Uint8Array([1, 127, 254]);

      const result = concatenate([array1, array2]);

      expect(result).toEqual(new Uint8Array([0, 255, 128, 1, 127, 254]));
    });

    it('should handle large arrays', () => {
      const array1 = new Uint8Array(1000).fill(1);
      const array2 = new Uint8Array(2000).fill(2);
      const array3 = new Uint8Array(500).fill(3);

      const result = concatenate([array1, array2, array3]);

      expect(result).toBeDefined();
      if (result) {
        expect(result.length).toBe(3500);
      }
      expect(result.slice(0, 1000).every((x) => x === 1)).toBe(true);
      expect(result.slice(1000, 3000).every((x) => x === 2)).toBe(true);
      expect(result.slice(3000, 3500).every((x) => x === 3)).toBe(true);
    });

    it('should maintain proper byte order', () => {
      const array1 = new Uint8Array([0x01, 0x02]);
      const array2 = new Uint8Array([0x03, 0x04]);
      const array3 = new Uint8Array([0x05, 0x06]);

      const result = concatenate([array1, array2, array3]);

      expect(Array.from(result)).toEqual([0x01, 0x02, 0x03, 0x04, 0x05, 0x06]);
    });
  });
});
