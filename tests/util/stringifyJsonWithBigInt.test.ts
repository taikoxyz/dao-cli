// Import the module to apply the JSON.stringify override
import '../../src/util/stringifyJsonWithBigInt';

describe('stringifyJsonWithBigInt', () => {
  // Store original JSON.stringify to restore after tests
  const originalStringify = JSON.stringify;

  afterAll(() => {
    // Restore original JSON.stringify
    JSON.stringify = originalStringify;
  });

  describe('BigInt handling', () => {
    it('should convert BigInt values to strings', () => {
      const obj = {
        normalNumber: 42,
        bigIntValue: BigInt('123456789012345678901234567890'),
        normalString: 'hello',
      };

      const result = JSON.stringify(obj);

      expect(typeof result).toBe('string');
      const parsed = JSON.parse(result);
      expect(parsed.normalNumber).toBe(42);
      expect(parsed.bigIntValue).toBe('123456789012345678901234567890');
      expect(parsed.normalString).toBe('hello');
    });

    it('should handle BigInt in nested objects', () => {
      const obj = {
        level1: {
          level2: {
            bigIntValue: BigInt('999999999999999999999'),
            regularValue: 'test',
          },
        },
      };

      const result = JSON.stringify(obj);
      const parsed = JSON.parse(result);

      expect(parsed.level1.level2.bigIntValue).toBe('999999999999999999999');
      expect(parsed.level1.level2.regularValue).toBe('test');
    });

    it('should handle BigInt in arrays', () => {
      const obj = {
        numbers: [1, BigInt('123'), 3, BigInt('456')],
        mixed: ['string', BigInt('789'), true, null],
      };

      const result = JSON.stringify(obj);
      const parsed = JSON.parse(result);

      expect(parsed.numbers).toEqual([1, '123', 3, '456']);
      expect(parsed.mixed).toEqual(['string', '789', true, null]);
    });

    it('should handle BigInt at root level', () => {
      const bigIntValue = BigInt('987654321098765432109876543210');

      const result = JSON.stringify(bigIntValue);

      expect(result).toBe('"987654321098765432109876543210"');
    });

    it('should handle empty BigInt', () => {
      const obj = {
        zero: BigInt(0),
        positive: BigInt(1),
        negative: BigInt(-1),
      };

      const result = JSON.stringify(obj);
      const parsed = JSON.parse(result);

      expect(parsed.zero).toBe('0');
      expect(parsed.positive).toBe('1');
      expect(parsed.negative).toBe('-1');
    });
  });

  describe('compatibility with original JSON.stringify', () => {
    it('should handle normal objects without BigInt', () => {
      const obj = {
        string: 'hello',
        number: 42,
        boolean: true,
        null_value: null,
        array: [1, 2, 3],
        nested: { key: 'value' },
      };

      const result = JSON.stringify(obj);

      expect(result).toBe(
        '{"string":"hello","number":42,"boolean":true,"null_value":null,"array":[1,2,3],"nested":{"key":"value"}}',
      );
    });

    it('should handle undefined values correctly', () => {
      const obj = {
        defined: 'value',
        undefined_value: undefined,
        bigint: BigInt(123),
      };

      const result = JSON.stringify(obj);
      const parsed = JSON.parse(result);

      expect(parsed.defined).toBe('value');
      expect(parsed.undefined_value).toBeUndefined();
      expect(parsed.bigint).toBe('123');
    });

    it('should handle primitive values', () => {
      expect(JSON.stringify('string')).toBe('"string"');
      expect(JSON.stringify(42)).toBe('42');
      expect(JSON.stringify(true)).toBe('true');
      expect(JSON.stringify(null)).toBe('null');
      expect(JSON.stringify(BigInt(123))).toBe('"123"');
    });

    it('should handle arrays correctly', () => {
      const arr = [1, 'string', true, null, BigInt(456)];

      const result = JSON.stringify(arr);

      expect(result).toBe('[1,"string",true,null,"456"]');
    });
  });

  describe('replacer function compatibility', () => {
    it('should work with function replacer', () => {
      const obj = {
        keep: 'this',
        remove: 'this',
        bigint: BigInt(123),
      };

      const replacer = (key: string, value: any) => {
        if (key === 'remove') return undefined;
        return value;
      };

      const result = JSON.stringify(obj, replacer);
      const parsed = JSON.parse(result);

      expect(parsed.keep).toBe('this');
      expect(parsed.remove).toBeUndefined();
      expect(parsed.bigint).toBe('123');
    });

    it('should work with array replacer', () => {
      const obj = {
        keep: 'this',
        remove: 'this should not appear',
        normalNumber: 123,
      };

      const result = JSON.stringify(obj, ['keep', 'normalNumber']);
      const parsed = JSON.parse(result);

      expect(parsed.keep).toBe('this');
      expect(parsed.remove).toBeUndefined();
      expect(parsed.normalNumber).toBe(123);
    });

    it('should combine custom replacer with BigInt handling', () => {
      const obj = {
        multiplier: 2,
        bigint: BigInt(100),
        string: 'test',
      };

      const replacer = (key: string, value: any) => {
        if (key === 'multiplier' && typeof value === 'number') {
          return value * 2;
        }
        return value;
      };

      const result = JSON.stringify(obj, replacer);
      const parsed = JSON.parse(result);

      expect(parsed.multiplier).toBe(4); // 2 * 2
      expect(parsed.bigint).toBe('100'); // BigInt converted to string
      expect(parsed.string).toBe('test');
    });
  });

  describe('space parameter compatibility', () => {
    it('should work with space as number', () => {
      const obj = {
        key: 'value',
        bigint: BigInt(123),
      };

      const result = JSON.stringify(obj, null, 2);

      expect(result).toContain('  "key": "value"');
      expect(result).toContain('  "bigint": "123"');
    });

    it('should work with space as string', () => {
      const obj = {
        key: 'value',
        bigint: BigInt(456),
      };

      const result = JSON.stringify(obj, null, '  ');

      expect(result).toContain('  "key": "value"');
      expect(result).toContain('  "bigint": "456"');
    });
  });

  describe('edge cases', () => {
    it('should handle circular references (should throw)', () => {
      const obj: any = { key: 'value' };
      obj.circular = obj;

      expect(() => {
        JSON.stringify(obj);
      }).toThrow();
    });

    it('should handle complex nested structures with BigInt', () => {
      const obj = {
        data: {
          transactions: [
            {
              id: BigInt('1'),
              amount: BigInt('1000000000000000000'), // 1 ETH in wei
              from: '0x123',
              to: '0x456',
            },
            {
              id: BigInt('2'),
              amount: BigInt('500000000000000000'), // 0.5 ETH in wei
              from: '0x789',
              to: '0xabc',
            },
          ],
          totalAmount: BigInt('1500000000000000000'),
        },
      };

      const result = JSON.stringify(obj);
      const parsed = JSON.parse(result);

      expect(parsed.data.transactions[0].id).toBe('1');
      expect(parsed.data.transactions[0].amount).toBe('1000000000000000000');
      expect(parsed.data.transactions[1].id).toBe('2');
      expect(parsed.data.transactions[1].amount).toBe('500000000000000000');
      expect(parsed.data.totalAmount).toBe('1500000000000000000');
    });

    it('should handle BigInt with very large values', () => {
      const obj = {
        veryLarge: BigInt('123456789012345678901234567890123456789012345678901234567890'),
        maxSafeInteger: BigInt(Number.MAX_SAFE_INTEGER),
        beyondMaxSafe: BigInt(Number.MAX_SAFE_INTEGER) + BigInt(1),
      };

      const result = JSON.stringify(obj);
      const parsed = JSON.parse(result);

      expect(parsed.veryLarge).toBe('123456789012345678901234567890123456789012345678901234567890');
      expect(parsed.maxSafeInteger).toBe(Number.MAX_SAFE_INTEGER.toString());
      expect(parsed.beyondMaxSafe).toBe((Number.MAX_SAFE_INTEGER + 1).toString());
    });

    it('should handle objects with BigInt symbols and computed properties', () => {
      const obj = {
        [Symbol.for('bigint')]: BigInt(123), // Symbols should be ignored by JSON.stringify anyway
        computed: BigInt(456),
        'string-key': BigInt(789),
      };

      const result = JSON.stringify(obj);
      const parsed = JSON.parse(result);

      expect(parsed.computed).toBe('456');
      expect(parsed['string-key']).toBe('789');
      // Symbol properties are not included in JSON.stringify
      expect(parsed[Symbol.for('bigint') as any]).toBeUndefined();
    });
  });

  describe('type assertion validation', () => {
    it('should maintain proper function signature', () => {
      // This test ensures that the type assertion preserves the function signature
      const obj = { bigint: BigInt(123), normal: 'value' };

      // Should accept all the same parameters as original JSON.stringify
      const result1 = JSON.stringify(obj);
      const result2 = JSON.stringify(obj, null);
      const result3 = JSON.stringify(obj, null, 2);
      const result4 = JSON.stringify(obj, ['normal']); // Don't include bigint in array replacer
      const result5 = JSON.stringify(obj, (key, value) => value);

      expect(typeof result1).toBe('string');
      expect(typeof result2).toBe('string');
      expect(typeof result3).toBe('string');
      expect(typeof result4).toBe('string');
      expect(typeof result5).toBe('string');
    });
  });
});
