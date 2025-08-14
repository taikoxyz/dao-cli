import * as fs from 'fs/promises';
import * as path from 'path';
import { JsonCache } from '../../../src/api/cache/index';

// Mock fs module
jest.mock('fs/promises');
const mockFs = fs as jest.Mocked<typeof fs>;

describe('JsonCache', () => {
  let cache: JsonCache;
  let testFilePath: string;

  beforeEach(() => {
    jest.clearAllMocks();
    testFilePath = path.join(process.cwd(), '.test-cache.json');
    cache = new JsonCache('.test-cache.json');
  });

  describe('constructor', () => {
    it('should create cache with default filename', () => {
      const defaultCache = new JsonCache();
      expect(defaultCache).toBeInstanceOf(JsonCache);
    });

    it('should create cache with custom filename', () => {
      const customCache = new JsonCache('custom-cache.json');
      expect(customCache).toBeInstanceOf(JsonCache);
    });
  });

  describe('loadCache', () => {
    it('should load existing cache file', async () => {
      const mockData = { key1: 'value1', key2: 'value2' };
      mockFs.readFile.mockResolvedValue(JSON.stringify(mockData));

      const result = await cache.get('key1');

      expect(mockFs.readFile).toHaveBeenCalledWith(testFilePath, 'utf-8');
      expect(result).toBe('value1');
    });

    it('should handle non-existent cache file', async () => {
      mockFs.readFile.mockRejectedValue(new Error('File not found'));

      const result = await cache.get('nonexistent');

      expect(result).toBeNull();
    });

    it('should handle invalid JSON in cache file', async () => {
      mockFs.readFile.mockResolvedValue('invalid json content');

      const result = await cache.get('key');

      expect(result).toBeNull();
    });
  });

  describe('saveCache', () => {
    it('should save cache to file', async () => {
      mockFs.readFile.mockResolvedValue('{}');
      mockFs.writeFile.mockResolvedValue();

      await cache.set('testKey', 'testValue');

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        testFilePath,
        expect.stringMatching(/"testKey":\s*"testValue"/)
      );
    });

    it('should handle write errors', async () => {
      mockFs.readFile.mockResolvedValue('{}');
      mockFs.writeFile.mockRejectedValue(new Error('Write permission denied'));

      await expect(cache.set('key', 'value')).rejects.toThrow('Write permission denied');
    });
  });

  describe('get', () => {
    it('should return value for existing key', async () => {
      const mockData = { existingKey: 'existingValue' };
      mockFs.readFile.mockResolvedValue(JSON.stringify(mockData));

      const result = await cache.get('existingKey');

      expect(result).toBe('existingValue');
    });

    it('should return null for non-existing key', async () => {
      mockFs.readFile.mockResolvedValue('{}');

      const result = await cache.get('nonExistingKey');

      expect(result).toBeNull();
    });

    it('should return typed value', async () => {
      const mockData = { 
        stringKey: 'string value',
        numberKey: 42,
        booleanKey: true,
        objectKey: { nested: 'value' },
        arrayKey: [1, 2, 3]
      };
      mockFs.readFile.mockResolvedValue(JSON.stringify(mockData));

      const stringResult = await cache.get<string>('stringKey');
      const numberResult = await cache.get<number>('numberKey');
      const booleanResult = await cache.get<boolean>('booleanKey');
      const objectResult = await cache.get<{nested: string}>('objectKey');
      const arrayResult = await cache.get<number[]>('arrayKey');

      expect(stringResult).toBe('string value');
      expect(numberResult).toBe(42);
      expect(booleanResult).toBe(true);
      expect(objectResult).toEqual({ nested: 'value' });
      expect(arrayResult).toEqual([1, 2, 3]);
    });
  });

  describe('set', () => {
    it('should set a new key-value pair', async () => {
      mockFs.readFile.mockResolvedValue('{}');
      mockFs.writeFile.mockResolvedValue();

      await cache.set('newKey', 'newValue');

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        testFilePath,
        expect.stringMatching(/"newKey":\s*"newValue"/)
      );
    });

    it('should update existing key', async () => {
      mockFs.readFile.mockResolvedValue('{"existingKey":"oldValue"}');
      mockFs.writeFile.mockResolvedValue();

      await cache.set('existingKey', 'newValue');

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        testFilePath,
        expect.stringMatching(/"existingKey":\s*"newValue"/)
      );
    });

    it('should handle complex objects', async () => {
      mockFs.readFile.mockResolvedValue('{}');
      mockFs.writeFile.mockResolvedValue();

      const complexObject = {
        nested: {
          array: [1, 2, 3],
          boolean: true,
          null_value: null
        }
      };

      await cache.set('complexKey', complexObject);

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        testFilePath,
        expect.stringContaining('"complexKey"')
      );
    });
  });

  describe('delete', () => {
    it('should delete existing key', async () => {
      mockFs.readFile.mockResolvedValue('{"key1":"value1","key2":"value2"}');
      mockFs.writeFile.mockResolvedValue();

      const result = await cache.delete('key1');

      expect(result).toBe(true);
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        testFilePath,
        expect.not.stringContaining('"key1"')
      );
    });

    it('should return false for non-existing key', async () => {
      mockFs.readFile.mockResolvedValue('{"key1":"value1"}');

      const result = await cache.delete('nonExistingKey');

      expect(result).toBe(false);
    });
  });

  describe('has', () => {
    it('should return true for existing key', async () => {
      mockFs.readFile.mockResolvedValue('{"existingKey":"value"}');

      const result = await cache.has('existingKey');

      expect(result).toBe(true);
    });

    it('should return false for non-existing key', async () => {
      mockFs.readFile.mockResolvedValue('{"existingKey":"value"}');

      const result = await cache.has('nonExistingKey');

      expect(result).toBe(false);
    });
  });

  describe('keys', () => {
    it('should return all keys', async () => {
      mockFs.readFile.mockResolvedValue('{"key1":"value1","key2":"value2","key3":"value3"}');

      const keys = await cache.keys();

      expect(keys).toEqual(['key1', 'key2', 'key3']);
    });

    it('should return empty array for empty cache', async () => {
      mockFs.readFile.mockResolvedValue('{}');

      const keys = await cache.keys();

      expect(keys).toEqual([]);
    });
  });

  describe('clear', () => {
    it('should clear all cache data', async () => {
      mockFs.writeFile.mockResolvedValue();

      await cache.clear();

      expect(mockFs.writeFile).toHaveBeenCalledWith(testFilePath, '{}');
    });
  });

  describe('getAll', () => {
    it('should return all cache data', async () => {
      const mockData = { key1: 'value1', key2: 'value2' };
      mockFs.readFile.mockResolvedValue(JSON.stringify(mockData));

      const allData = await cache.getAll();

      expect(allData).toEqual(mockData);
      expect(allData).not.toBe(mockData); // Should be a copy
    });

    it('should return empty object for empty cache', async () => {
      mockFs.readFile.mockResolvedValue('{}');

      const allData = await cache.getAll();

      expect(allData).toEqual({});
    });
  });

  describe('setMultiple', () => {
    it('should set multiple key-value pairs', async () => {
      mockFs.readFile.mockResolvedValue('{"existing":"value"}');
      mockFs.writeFile.mockResolvedValue();

      const newData = {
        key1: 'value1',
        key2: 'value2',
        key3: { nested: 'object' }
      };

      await cache.setMultiple(newData);

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        testFilePath,
        expect.stringMatching(/"existing":\s*"value"/)
      );
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        testFilePath,
        expect.stringMatching(/"key1":\s*"value1"/)
      );
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        testFilePath,
        expect.stringMatching(/"key2":\s*"value2"/)
      );
    });

    it('should merge with existing data', async () => {
      mockFs.readFile.mockResolvedValue('{"existing":"value","overwrite":"old"}');
      mockFs.writeFile.mockResolvedValue();

      const newData = {
        overwrite: 'new',
        additional: 'data'
      };

      await cache.setMultiple(newData);

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        testFilePath,
        expect.stringMatching(/"existing":\s*"value"/)
      );
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        testFilePath,
        expect.stringMatching(/"overwrite":\s*"new"/)
      );
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        testFilePath,
        expect.stringMatching(/"additional":\s*"data"/)
      );
    });
  });

  describe('error handling', () => {
    it('should handle read errors gracefully in loadCache', async () => {
      mockFs.readFile.mockRejectedValue(new Error('Permission denied'));

      const result = await cache.get('someKey');

      expect(result).toBeNull();
    });

    it('should propagate write errors in saveCache', async () => {
      mockFs.readFile.mockResolvedValue('{}');
      mockFs.writeFile.mockRejectedValue(new Error('Disk full'));

      await expect(cache.set('key', 'value')).rejects.toThrow('Disk full');
    });
  });

  describe('concurrent operations', () => {
    it('should handle concurrent read operations', async () => {
      const mockData = { key1: 'value1', key2: 'value2' };
      mockFs.readFile.mockResolvedValue(JSON.stringify(mockData));

      const promises = [
        cache.get('key1'),
        cache.get('key2'),
        cache.has('key1'),
        cache.keys()
      ];

      const results = await Promise.all(promises);

      expect(results[0]).toBe('value1');
      expect(results[1]).toBe('value2');
      expect(results[2]).toBe(true);
      expect(results[3]).toEqual(['key1', 'key2']);
    });

    it('should handle concurrent write operations', async () => {
      mockFs.readFile.mockResolvedValue('{}');
      mockFs.writeFile.mockResolvedValue();

      const promises = [
        cache.set('key1', 'value1'),
        cache.set('key2', 'value2'),
        cache.setMultiple({ key3: 'value3', key4: 'value4' })
      ];

      await expect(Promise.all(promises)).resolves.toBeDefined();
    });
  });
});