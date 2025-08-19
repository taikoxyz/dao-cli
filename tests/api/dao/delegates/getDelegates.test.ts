import getDelegates, { getDelegateCount, getDelegate } from '../../../../src/api/dao/delegates/getDelegates';
import { getPublicClient } from '../../../../src/api/viem';
import { INetworkConfig } from '../../../../src/types/network.type';
import getIpfsFile from '../../../../src/api/ipfs/getIpfsFile';
import axios from 'axios';

jest.mock('../../../../src/api/viem');
jest.mock('../../../../src/api/ipfs/getIpfsFile');
jest.mock('axios');
jest.mock('../../../../src/api/cache', () => ({
  cache: {
    get: jest.fn(),
    set: jest.fn(),
    has: jest.fn(),
  },
}));

const mockGetPublicClient = getPublicClient as jest.MockedFunction<typeof getPublicClient>;
const mockGetIpfsFile = getIpfsFile as jest.MockedFunction<typeof getIpfsFile>;
const mockAxios = axios as jest.Mocked<typeof axios>;
const { cache: mockCache } = require('../../../../src/api/cache');

describe('Delegates API', () => {
  let mockConfig: INetworkConfig;
  let mockPublicClient: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockConfig = {
      network: 'holesky',
      urls: {
        rpc: 'https://rpc.holesky.ethpandaops.io',
        explorer: 'https://holesky.etherscan.io',
      },
      subgraph: 'https://subgraph.holesky.example.com',
      contracts: {
        DAO: '0x1234567890abcdef1234567890abcdef12345678' as any,
        VotingToken: '0x2345678901abcdef2345678901abcdef23456789' as any,
        TaikoBridge: '0x3456789012abcdef3456789012abcdef34567890' as any,
        MultisigPlugin: '0x4567890123abcdef4567890123abcdef45678901' as any,
        EmergencyMultisigPlugin: '0x5678901234abcdef5678901234abcdef56789012' as any,
        OptimisticTokenVotingPlugin: '0x6789012345abcdef6789012345abcdef67890123' as any,
        SignerList: '0x7890123456abcdef7890123456abcdef78901234' as any,
        EncryptionRegistry: '0x8901234567abcdef8901234567abcdef89012345' as any,
        DelegationWall: '0x9012345678abcdef9012345678abcdef90123456' as any,
      },
    };

    mockPublicClient = {
      readContract: jest.fn(),
      multicall: jest.fn(),
    };

    mockGetPublicClient.mockReturnValue(mockPublicClient);
  });

  describe('getDelegateCount', () => {
    it('should return the count of delegates', async () => {
      mockPublicClient.readContract.mockResolvedValue(5n);

      const result = await getDelegateCount(mockConfig);

      expect(result).toBe(5);
      expect(mockPublicClient.readContract).toHaveBeenCalledWith(
        expect.objectContaining({
          address: mockConfig.contracts.DelegationWall,
          functionName: 'candidateCount',
        }),
      );
    });

    it('should handle errors gracefully', async () => {
      mockPublicClient.readContract.mockRejectedValue(new Error('Contract read failed'));

      const result = await getDelegateCount(mockConfig);

      expect(result).toBe(0);
    });
  });

  describe('getDelegates', () => {
    it('should return empty array when no delegates exist', async () => {
      mockCache.has.mockResolvedValue(false);
      mockPublicClient.readContract.mockResolvedValue([]); // getCandidateAddresses returns empty array

      const result = await getDelegates(mockConfig);

      expect(result).toEqual([]);
    });

    it('should refresh cache when metadata is missing', async () => {
      const cachedDelegates = [
        { address: '0xcached1', contentUrl: 'cached1' }, // No identifier
        { address: '0xcached2', contentUrl: 'cached2' }, // No identifier
      ];

      mockCache.has.mockResolvedValue(true);
      mockCache.get.mockResolvedValue(cachedDelegates);
      mockCache.set.mockResolvedValue(undefined);

      // Mock fresh data fetch
      mockPublicClient.readContract
        .mockResolvedValueOnce(['0xdelegate1']) // getCandidateAddresses
        .mockResolvedValueOnce('0x697066733a2f2f636f6e74656e7431'); // contentUrl

      const consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation();

      const result = await getDelegates(mockConfig);

      expect(consoleInfoSpy).toHaveBeenCalledWith('Cache found but metadata missing, refreshing...');
      expect(mockPublicClient.readContract).toHaveBeenCalled(); // Should fetch fresh data

      consoleInfoSpy.mockRestore();
    });

    it('should fetch all delegates', async () => {
      mockCache.has.mockResolvedValue(false);
      mockCache.set.mockResolvedValue(undefined);

      mockPublicClient.readContract
        .mockResolvedValueOnce(['0xdelegate1', '0xdelegate2']) // getCandidateAddresses
        .mockResolvedValueOnce('0x697066733a2f2f636f6e74656e7431') // contentUrl for delegate1
        .mockResolvedValueOnce('0x697066733a2f2f636f6e74656e7432'); // contentUrl for delegate2

      const result = await getDelegates(mockConfig);

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        address: '0xdelegate1',
        contentUrl: 'ipfs://content1',
      });
      expect(result[1]).toMatchObject({
        address: '0xdelegate2',
        contentUrl: 'ipfs://content2',
      });
    });

    it('should fetch delegates with IPFS metadata', async () => {
      mockCache.has.mockResolvedValue(false);
      mockCache.set.mockResolvedValue(undefined);

      mockPublicClient.readContract
        .mockResolvedValueOnce(['0xdelegate1']) // getCandidateAddresses
        .mockResolvedValueOnce('0x697066733a2f2f516d54657374313233'); // ipfs://QmTest123

      mockGetIpfsFile.mockResolvedValue({
        identifier: 'Test Identifier',
        description: 'Test description',
      });

      const result = await getDelegates(mockConfig);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        address: '0xdelegate1',
        contentUrl: 'ipfs://QmTest123',
        identifier: 'Test Identifier',
        metadata: {
          identifier: 'Test Identifier',
          description: 'Test description',
        },
      });
    });

    it('should use name field when identifier is not available', async () => {
      mockCache.has.mockResolvedValue(false);
      mockCache.set.mockResolvedValue(undefined);

      mockPublicClient.readContract
        .mockResolvedValueOnce(['0xdelegate1']) // getCandidateAddresses
        .mockResolvedValueOnce('0x697066733a2f2f516d54657374313233'); // ipfs://QmTest123

      mockGetIpfsFile.mockResolvedValue({
        name: 'Test Name',
        description: 'Test description',
      });

      const result = await getDelegates(mockConfig);

      expect(result[0].identifier).toBe('Test Name');
    });

    it('should use title field when identifier and name are not available', async () => {
      mockCache.has.mockResolvedValue(false);
      mockCache.set.mockResolvedValue(undefined);

      mockPublicClient.readContract
        .mockResolvedValueOnce(['0xdelegate1']) // getCandidateAddresses
        .mockResolvedValueOnce('0x697066733a2f2f516d54657374313233'); // ipfs://QmTest123

      mockGetIpfsFile.mockResolvedValue({
        title: 'Test Title',
        description: 'Test description',
      });

      const result = await getDelegates(mockConfig);

      expect(result[0].identifier).toBe('Test Title');
    });

    it('should use displayName field as last resort', async () => {
      mockCache.has.mockResolvedValue(false);
      mockCache.set.mockResolvedValue(undefined);

      mockPublicClient.readContract
        .mockResolvedValueOnce(['0xdelegate1']) // getCandidateAddresses
        .mockResolvedValueOnce('0x697066733a2f2f516d54657374313233'); // ipfs://QmTest123

      mockGetIpfsFile.mockResolvedValue({
        displayName: 'Test Display Name',
        description: 'Test description',
      });

      const result = await getDelegates(mockConfig);

      expect(result[0].identifier).toBe('Test Display Name');
    });

    it('should warn when no identifier fields are found', async () => {
      mockCache.has.mockResolvedValue(false);
      mockCache.set.mockResolvedValue(undefined);

      mockPublicClient.readContract
        .mockResolvedValueOnce(['0xdelegate1']) // getCandidateAddresses
        .mockResolvedValueOnce('0x697066733a2f2f516d54657374313233'); // ipfs://QmTest123

      mockGetIpfsFile.mockResolvedValue({
        description: 'Test description only',
      });

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = await getDelegates(mockConfig);

      expect(consoleWarnSpy).toHaveBeenCalledWith('No identifier found in metadata for 0xdelegate1');
      expect(result[0].identifier).toBeUndefined();

      consoleWarnSpy.mockRestore();
    });

    it('should handle null contentUrl bytes', async () => {
      mockCache.has.mockResolvedValue(false);
      mockCache.set.mockResolvedValue(undefined);

      mockPublicClient.readContract
        .mockResolvedValueOnce(['0xdelegate1']) // getCandidateAddresses
        .mockResolvedValueOnce(null); // null contentUrl

      const result = await getDelegates(mockConfig);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        address: '0xdelegate1',
        contentUrl: '',
      });
    });

    it('should handle IPFS metadata fetch errors', async () => {
      mockCache.has.mockResolvedValue(false);
      mockCache.set.mockResolvedValue(undefined);

      mockPublicClient.readContract
        .mockResolvedValueOnce(['0xdelegate1']) // getCandidateAddresses
        .mockResolvedValueOnce('0x697066733a2f2f516d54657374313233'); // ipfs://QmTest123

      mockGetIpfsFile.mockRejectedValue(new Error('IPFS fetch failed'));

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await getDelegates(mockConfig);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error fetching IPFS metadata for delegate 0xdelegate1:',
        expect.any(Error),
      );
      expect(result[0].metadata).toBeUndefined();

      consoleErrorSpy.mockRestore();
    });

    it('should handle individual delegate fetch errors', async () => {
      mockCache.has.mockResolvedValue(false);
      mockCache.set.mockResolvedValue(undefined);

      mockPublicClient.readContract
        .mockResolvedValueOnce(['0xdelegate1', '0xdelegate2']) // getCandidateAddresses
        .mockRejectedValueOnce(new Error('Contract read failed')) // fail for delegate1
        .mockResolvedValueOnce('0x697066733a2f2f636f6e74656e7432'); // succeed for delegate2

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await getDelegates(mockConfig);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error fetching profile for delegate 0xdelegate1:',
        expect.any(Error),
      );
      expect(result).toHaveLength(1);
      expect(result[0].address).toBe('0xdelegate2');

      consoleErrorSpy.mockRestore();
    });

    it('should use cached results when available', async () => {
      const cachedDelegates = [
        { address: '0xcached1', contentUrl: 'cached1', identifier: 'Cached 1' },
        { address: '0xcached2', contentUrl: 'cached2', identifier: 'Cached 2' },
      ];

      mockCache.has.mockResolvedValue(true);
      mockCache.get.mockResolvedValue(cachedDelegates);

      const result = await getDelegates(mockConfig);

      expect(result).toEqual(cachedDelegates);
      expect(mockPublicClient.readContract).not.toHaveBeenCalled();
    });

    it('should handle contract read errors', async () => {
      mockCache.has.mockResolvedValue(false);
      mockPublicClient.readContract
        .mockResolvedValueOnce(['0xdelegate1']) // getCandidateAddresses
        .mockRejectedValue(new Error('Contract read failed')); // fail on getting contentUrl

      const result = await getDelegates(mockConfig);

      expect(result).toEqual([]);
    });
  });

  describe('getDelegate', () => {
    const delegateAddress = '0xdelegate1';

    it('should fetch delegate basic info', async () => {
      // Mock contentUrl as hex encoded string
      mockPublicClient.readContract.mockResolvedValue('0x68747470733a2f2f6578616d706c652e636f6d2f64656c6567617465'); // hex for "https://example.com/delegate"

      const result = await getDelegate(delegateAddress, mockConfig, false);

      expect(result).toMatchObject({
        address: delegateAddress,
        contentUrl: 'https://example.com/delegate',
      });
    });

    it('should fetch delegate with voting power', async () => {
      mockPublicClient.readContract
        .mockResolvedValueOnce('0x68747470733a2f2f6578616d706c652e636f6d2f64656c6567617465') // contentUrl
        .mockResolvedValueOnce(1000n) // voting power
        .mockResolvedValueOnce(500n); // token balance

      const result = await getDelegate(delegateAddress, mockConfig, true);

      expect(result).toMatchObject({
        address: delegateAddress,
        contentUrl: 'https://example.com/delegate',
        votingPower: 1000n,
        tokenBalance: 500n,
      });
    });

    it('should fetch delegate metadata from IPFS', async () => {
      // Mock contentUrl as hex encoded IPFS URL
      mockPublicClient.readContract.mockResolvedValue('0x697066733a2f2f516d54657374313233'); // hex for "ipfs://QmTest123"
      mockGetIpfsFile.mockResolvedValue({ name: 'Test Delegate', bio: 'Test bio' });

      const result = await getDelegate(delegateAddress, mockConfig, false);

      expect(result?.metadata).toEqual({
        name: 'Test Delegate',
        bio: 'Test bio',
      });
      expect(result?.identifier).toBe('Test Delegate');
    });

    it('should handle HTTP metadata URLs', async () => {
      // Mock contentUrl as hex encoded HTTP URL
      // Note: Current implementation doesn't fetch HTTP metadata, only IPFS
      mockPublicClient.readContract.mockResolvedValue(
        '0x68747470733a2f2f6578616d706c652e636f6d2f6d657461646174612e6a736f6e',
      );

      const result = await getDelegate(delegateAddress, mockConfig, false);

      // HTTP URLs don't fetch metadata in current implementation
      expect(mockAxios.get).not.toHaveBeenCalled();
      expect(result).toMatchObject({
        address: delegateAddress,
        contentUrl: 'https://example.com/metadata.json',
      });
      expect(result?.metadata).toBeUndefined();
    });

    it('should handle metadata fetch errors', async () => {
      // Mock contentUrl as hex encoded IPFS URL
      mockPublicClient.readContract.mockResolvedValue('0x697066733a2f2f516d54657374313233'); // hex for "ipfs://QmTest123"
      mockGetIpfsFile.mockRejectedValue(new Error('Network error'));

      const result = await getDelegate(delegateAddress, mockConfig, false);

      expect(result).toMatchObject({
        address: delegateAddress,
        contentUrl: 'ipfs://QmTest123',
      });
      expect(result?.metadata).toBeUndefined();
    });

    it('should handle delegate not found', async () => {
      mockPublicClient.readContract.mockRejectedValue(new Error('Delegate not found'));

      const result = await getDelegate(delegateAddress, mockConfig, false);

      expect(result).toBeNull();
    });

    it('should handle empty contentUrl', async () => {
      mockPublicClient.readContract.mockResolvedValue(''); // Empty contentUrl

      const result = await getDelegate(delegateAddress, mockConfig, false);

      expect(result).toBeNull();
    });

    it('should handle null contentUrl bytes', async () => {
      mockPublicClient.readContract.mockResolvedValue(null); // null contentUrl

      const result = await getDelegate(delegateAddress, mockConfig, false);

      expect(result).toBeNull();
    });

    it('should extract identifier from metadata.name field', async () => {
      mockPublicClient.readContract.mockResolvedValue('0x697066733a2f2f516d54657374313233'); // ipfs://QmTest123
      mockGetIpfsFile.mockResolvedValue({ name: 'Test Name', bio: 'Test bio' });

      const result = await getDelegate(delegateAddress, mockConfig, false);

      expect(result?.identifier).toBe('Test Name');
    });

    it('should extract identifier from metadata.title field', async () => {
      mockPublicClient.readContract.mockResolvedValue('0x697066733a2f2f516d54657374313233'); // ipfs://QmTest123
      mockGetIpfsFile.mockResolvedValue({ title: 'Test Title', bio: 'Test bio' });

      const result = await getDelegate(delegateAddress, mockConfig, false);

      expect(result?.identifier).toBe('Test Title');
    });

    it('should extract identifier from metadata.displayName field', async () => {
      mockPublicClient.readContract.mockResolvedValue('0x697066733a2f2f516d54657374313233'); // ipfs://QmTest123
      mockGetIpfsFile.mockResolvedValue({ displayName: 'Test Display', bio: 'Test bio' });

      const result = await getDelegate(delegateAddress, mockConfig, false);

      expect(result?.identifier).toBe('Test Display');
    });

    it('should handle non-object metadata', async () => {
      mockPublicClient.readContract.mockResolvedValue('0x697066733a2f2f516d54657374313233'); // ipfs://QmTest123
      mockGetIpfsFile.mockResolvedValue('string metadata'); // Non-object metadata

      const result = await getDelegate(delegateAddress, mockConfig, false);

      expect(result?.metadata).toBe('string metadata');
      expect(result?.identifier).toBeUndefined();
    });
  });

  describe('getDelegateVotingPower', () => {
    it('should fetch voting power and token balance', async () => {
      mockPublicClient.readContract
        .mockResolvedValueOnce(1000n) // voting power
        .mockResolvedValueOnce(500n); // token balance

      const { getDelegateVotingPower } = require('../../../../src/api/dao/delegates/getDelegates');
      const result = await getDelegateVotingPower('0xdelegate1', mockConfig);

      expect(result).toEqual({
        votingPower: 1000n,
        tokenBalance: 500n,
      });
    });

    it('should return zeros on error', async () => {
      mockPublicClient.readContract.mockRejectedValue(new Error('Contract read failed'));

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const { getDelegateVotingPower } = require('../../../../src/api/dao/delegates/getDelegates');
      const result = await getDelegateVotingPower('0xdelegate1', mockConfig);

      expect(result).toEqual({
        votingPower: 0n,
        tokenBalance: 0n,
      });
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });
});
