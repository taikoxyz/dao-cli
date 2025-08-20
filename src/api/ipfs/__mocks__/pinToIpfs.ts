/* global jest */
export const pinJsonToIpfs = jest.fn();

export const testIpfsPinning = jest.fn(async () => {
  try {
    const testData = {
      test: true,
      timestamp: new Date().toISOString(),
      message: 'IPFS pinning test',
    };

    const hash = await pinJsonToIpfs(testData);
    console.info(`IPFS pinning test successful! Hash: ${hash}`);
    return true;
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error(`IPFS pinning test failed: ${err.message || 'Unknown error'}`);
    return false;
  }
});
