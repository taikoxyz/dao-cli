import { pinJsonToIpfs } from '../../../src/api/ipfs/pinToIpfs';
import axios from 'axios';

jest.mock('axios');

describe('pinJsonToIpfs', () => {
  let consoleInfoSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let consoleLogSpy: jest.SpyInstance;
  const mockAxios = axios as jest.Mocked<typeof axios>;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

    // Mock environment variables
    process.env.PINATA_JWT = 'test-jwt-token';
  });

  afterEach(() => {
    consoleInfoSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    consoleLogSpy.mockRestore();
    delete process.env.PINATA_JWT;
  });

  it('should successfully pin JSON to IPFS', async () => {
    const testData = { test: 'data', value: 123 };
    const mockResponse = {
      data: {
        IpfsHash: 'QmTestHash123456789',
        PinSize: 1234,
        Timestamp: '2024-01-01T00:00:00Z',
      },
    };

    mockAxios.post.mockResolvedValue(mockResponse);

    const result = await pinJsonToIpfs(testData);

    expect(result).toBe('QmTestHash123456789');
    expect(consoleInfoSpy).toHaveBeenCalledWith('Pinning to IPFS via Pinata...');
    expect(consoleInfoSpy).toHaveBeenCalledWith('Successfully pinned to IPFS: QmTestHash123456789');
    expect(mockAxios.post).toHaveBeenCalledWith(
      'https://api.pinata.cloud/pinning/pinJSONToIPFS',
      expect.objectContaining({
        pinataContent: testData,
        pinataMetadata: {
          name: expect.stringMatching(/^proposal-\d+$/),
        },
        pinataOptions: {
          cidVersion: 1,
        },
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-jwt-token',
        },
      },
    );
  });

  it('should throw error when PINATA_JWT is not set', async () => {
    delete process.env.PINATA_JWT;
    const testData = { test: 'data' };

    await expect(pinJsonToIpfs(testData)).rejects.toThrow(
      'IPFS pinning not configured. Please set PINATA_JWT in your .env file.',
    );
  });

  it('should handle API errors', async () => {
    const testData = { test: 'data' };
    const error = new Error('API Error');

    mockAxios.post.mockRejectedValue(error);

    await expect(pinJsonToIpfs(testData)).rejects.toThrow('Failed to pin to Pinata: API Error');
  });

  it('should handle network errors', async () => {
    const testData = { test: 'data' };
    const error = {
      response: {
        status: 401,
        data: { error: 'Unauthorized' },
      },
    };

    mockAxios.post.mockRejectedValue(error);

    await expect(pinJsonToIpfs(testData)).rejects.toThrow('Invalid Pinata credentials. Please check your PINATA_JWT.');
  });

  it('should pin large data objects', async () => {
    const largeData = {
      items: Array(1000).fill({ data: 'test', value: 123 }),
      metadata: { size: 'large' },
    };
    const mockResponse = {
      data: {
        IpfsHash: 'QmLargeHash',
        PinSize: 123456,
      },
    };

    mockAxios.post.mockResolvedValue(mockResponse);

    const result = await pinJsonToIpfs(largeData);

    expect(result).toBe('QmLargeHash');
    expect(mockAxios.post).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        pinataContent: largeData,
      }),
      expect.any(Object) as unknown,
    );
  });

  it('should handle empty data', async () => {
    const emptyData = {};
    const mockResponse = {
      data: {
        IpfsHash: 'QmEmptyHash',
      },
    };

    mockAxios.post.mockResolvedValue(mockResponse);

    const result = await pinJsonToIpfs(emptyData);

    expect(result).toBe('QmEmptyHash');
  });

  it('should handle missing IpfsHash in response', async () => {
    const testData = { test: 'data' };
    const mockResponse = {
      data: {
        PinSize: 1234,
      },
    };

    mockAxios.post.mockResolvedValue(mockResponse);

    const result = await pinJsonToIpfs(testData);

    expect(result).toBeUndefined();
    expect(consoleInfoSpy).toHaveBeenCalledWith('Successfully pinned to IPFS: undefined');
  });

  it('should handle complex nested JSON structures', async () => {
    const complexJson = {
      nested: {
        deep: {
          value: 123,
          array: [1, 2, 3],
        },
      },
      bigInt: '1000000000000000000',
    };
    const mockResponse = {
      data: {
        IpfsHash: 'QmComplexHash',
      },
    };

    mockAxios.post.mockResolvedValue(mockResponse);

    const result = await pinJsonToIpfs(complexJson);

    expect(result).toBe('QmComplexHash');
    expect(mockAxios.post).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        pinataContent: complexJson,
      }),
      expect.any(Object) as unknown,
    );
  });

  it('should handle null and undefined values in JSON', async () => {
    const jsonWithNulls = {
      nullValue: null,
      undefinedValue: undefined,
      normalValue: 'test',
    };
    const mockResponse = {
      data: {
        IpfsHash: 'QmNullHash',
      },
    };

    mockAxios.post.mockResolvedValue(mockResponse);

    const result = await pinJsonToIpfs(jsonWithNulls);

    expect(result).toBe('QmNullHash');
  });

  it('should handle rate limiting errors', async () => {
    const testJson = { data: 'test' };
    const rateLimitError = {
      response: {
        status: 429,
        data: { error: 'Rate limit exceeded' },
      },
    };

    mockAxios.post.mockRejectedValue(rateLimitError);

    await expect(pinJsonToIpfs(testJson)).rejects.toThrow('Pinata rate limit exceeded. Please wait and try again.');
  });

  it('should handle timeout errors', async () => {
    const testJson = { data: 'test' };
    const timeoutError = {
      code: 'ECONNABORTED',
      message: 'timeout of 10000ms exceeded',
    };

    mockAxios.post.mockRejectedValue(timeoutError);

    await expect(pinJsonToIpfs(testJson)).rejects.toThrow('Failed to pin to Pinata: timeout of 10000ms exceeded');
  });

  it('should include correct metadata with current timestamp', async () => {
    const testData = { test: 'data' };
    const beforeTime = Date.now();
    const mockResponse = {
      data: {
        IpfsHash: 'QmTestHash',
      },
    };

    mockAxios.post.mockResolvedValue(mockResponse);

    await pinJsonToIpfs(testData);

    const afterTime = Date.now();

    expect(mockAxios.post).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        pinataMetadata: {
          name: expect.stringMatching(/^proposal-\d+$/),
        },
      }),
      expect.any(Object) as unknown,
    );

    const calledData = mockAxios.post.mock.calls[0][1] as { pinataMetadata: { name: string } };
    const timestamp = parseInt(calledData.pinataMetadata.name.split('-')[1]);
    expect(timestamp).toBeGreaterThanOrEqual(beforeTime);
    expect(timestamp).toBeLessThanOrEqual(afterTime);
  });
});
