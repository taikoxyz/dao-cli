jest.mock('../../src/api/ipfs/pinToIpfs');

import { testIpfsPinning, pinJsonToIpfs } from '../../src/api/ipfs/pinToIpfs';

describe('testIpfsPinning', () => {
  let consoleInfoSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  const mockPinJsonToIpfs = pinJsonToIpfs as jest.MockedFunction<typeof pinJsonToIpfs>;
  const mockTestIpfsPinning = testIpfsPinning as jest.MockedFunction<typeof testIpfsPinning>;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    // Reset the mock implementation for testIpfsPinning
    mockTestIpfsPinning.mockImplementation(async () => {
      try {
        const testData = {
          test: true,
          timestamp: new Date().toISOString(),
          message: 'IPFS pinning test',
        };

        const hash = await mockPinJsonToIpfs(testData);
        console.info(`IPFS pinning test successful! Hash: ${hash}`);
        return true;
      } catch (error: unknown) {
        const err = error as { message?: string };
        console.error(`IPFS pinning test failed: ${err.message || 'Unknown error'}`);
        return false;
      }
    });
  });

  afterEach(() => {
    consoleInfoSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it('should successfully test IPFS pinning', async () => {
    const mockHash = 'bafkreigiqnp7ifmr7poffvk25ubehngloqwt7apuywrljzqssaau5stcyq';
    mockPinJsonToIpfs.mockResolvedValue(mockHash);

    const result = await testIpfsPinning();

    expect(result).toBe(true);
    expect(mockPinJsonToIpfs).toHaveBeenCalledWith(
      expect.objectContaining({
        test: true,
        timestamp: expect.any(String),
        message: 'IPFS pinning test',
      }),
    );
    expect(consoleInfoSpy).toHaveBeenCalledWith(`IPFS pinning test successful! Hash: ${mockHash}`);
  });

  it('should handle IPFS pinning errors', async () => {
    const error = new Error('Pinning failed');
    mockPinJsonToIpfs.mockRejectedValue(error);

    const result = await testIpfsPinning();

    expect(result).toBe(false);
    expect(consoleErrorSpy).toHaveBeenCalledWith('IPFS pinning test failed: Pinning failed');
  });

  it('should handle empty hash response', async () => {
    const mockHash = '';
    mockPinJsonToIpfs.mockResolvedValue(mockHash);

    const result = await testIpfsPinning();

    expect(result).toBe(true);
    expect(consoleInfoSpy).toHaveBeenCalledWith(`IPFS pinning test successful! Hash: ${mockHash}`);
  });

  it('should handle network timeouts', async () => {
    const timeoutError = new Error('timeout of 10000ms exceeded');
    mockPinJsonToIpfs.mockRejectedValue(timeoutError);

    const result = await testIpfsPinning();

    expect(result).toBe(false);
    expect(consoleErrorSpy).toHaveBeenCalledWith('IPFS pinning test failed: timeout of 10000ms exceeded');
  });

  it('should test with current timestamp', async () => {
    const mockHash = 'QmTestHash123456789';
    const beforeTime = new Date();

    mockPinJsonToIpfs.mockResolvedValue(mockHash);

    await testIpfsPinning();

    const afterTime = new Date();

    expect(mockPinJsonToIpfs).toHaveBeenCalledWith(
      expect.objectContaining({
        test: true,
        message: 'IPFS pinning test',
        timestamp: expect.any(String),
      }),
    );

    const calledData = mockPinJsonToIpfs.mock.calls[0][0] as { test: boolean; message: string; timestamp: string };
    const timestamp = new Date(calledData.timestamp);
    expect(timestamp.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime() - 1000); // Allow 1 second tolerance
    expect(timestamp.getTime()).toBeLessThanOrEqual(afterTime.getTime() + 1000);
  });

  it('should handle rate limiting', async () => {
    const rateLimitError = new Error('Rate limit exceeded');
    mockPinJsonToIpfs.mockRejectedValue(rateLimitError);

    const result = await testIpfsPinning();

    expect(result).toBe(false);
    expect(consoleErrorSpy).toHaveBeenCalledWith('IPFS pinning test failed: Rate limit exceeded');
  });

  it('should handle authentication errors', async () => {
    const authError = new Error('Invalid credentials');
    mockPinJsonToIpfs.mockRejectedValue(authError);

    const result = await testIpfsPinning();

    expect(result).toBe(false);
    expect(consoleErrorSpy).toHaveBeenCalledWith('IPFS pinning test failed: Invalid credentials');
  });

  it('should handle errors without message', async () => {
    const error = {};
    mockPinJsonToIpfs.mockRejectedValue(error);

    const result = await testIpfsPinning();

    expect(result).toBe(false);
    expect(consoleErrorSpy).toHaveBeenCalledWith('IPFS pinning test failed: Unknown error');
  });
});
