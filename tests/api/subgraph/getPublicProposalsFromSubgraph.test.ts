import { getPublicProposalsFromSubgraph } from '../../../src/api/subgraph/getPublicProposalsFromSubgraph';
import { fetchAllPublicProposalsFromSubgraph } from '../../../src/api/subgraph/index';
import getIpfsFile, { getIpfsFileSafe } from '../../../src/api/ipfs/getIpfsFile';
import { INetworkConfig } from '../../../src/types/network.type';
import { IProposalMetadata } from '../../../src/types/proposal.type';
import { Address } from 'viem';

jest.mock('../../../src/api/subgraph/index');
jest.mock('../../../src/api/ipfs/getIpfsFile');

describe('getPublicProposalsFromSubgraph', () => {
  const mockConfig: INetworkConfig = {
    network: 'mainnet',
    contracts: {
      DAO: '0x0000000000000000000000000000000000000001' as Address,
      VotingToken: '0x0000000000000000000000000000000000000002' as Address,
      TaikoBridge: '0x0000000000000000000000000000000000000003' as Address,
      MultisigPlugin: '0x0000000000000000000000000000000000000004' as Address,
      EmergencyMultisigPlugin: '0x0000000000000000000000000000000000000005' as Address,
      OptimisticTokenVotingPlugin: '0x0000000000000000000000000000000000000006' as Address,
      SignerList: '0x0000000000000000000000000000000000000007' as Address,
      EncryptionRegistry: '0x0000000000000000000000000000000000000008' as Address,
      DelegationWall: '0x0000000000000000000000000000000000000009' as Address,
    },
    urls: {
      explorer: 'https://etherscan.io',
      rpc: 'https://mainnet.infura.io',
    },
    subgraph: 'https://api.thegraph.com/subgraphs/name/test',
  };

  const mockSubgraphProposals = [
    {
      id: '0x001',
      creator: 'Alice',
      startDate: '1704067200', // 2024-01-01 00:00:00 UTC
      endDate: '1704153600', // 2024-01-02 00:00:00 UTC
      creatorAddress: '0x1234567890123456789012345678901234567890',
      contractEventId: 'event-1',
      creationBlockNumber: '1000000',
      metadata: 'ipfs://QmTest1234567890abcdef',
    },
    {
      id: '0x002',
      creator: 'Bob',
      startDate: '1704240000', // 2024-01-03 00:00:00 UTC
      endDate: '1704326400', // 2024-01-04 00:00:00 UTC
      creatorAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      contractEventId: 'event-2',
      creationBlockNumber: '1000100',
      metadata: 'ipfs://QmTest9876543210fedcba',
    },
    {
      id: '0x003',
      creator: 'Charlie',
      startDate: '1704412800', // 2024-01-05 00:00:00 UTC
      endDate: '1704499200', // 2024-01-06 00:00:00 UTC
      creatorAddress: '0xfedcbafedcbafedcbafedcbafedcbafedcbafedc',
      contractEventId: 'event-3',
      creationBlockNumber: '1000200',
      metadata: '', // Empty metadata
    },
  ];

  const mockMetadata1: IProposalMetadata = {
    id: 1,
    title: 'Proposal 1',
    summary: 'Summary of proposal 1',
    description: 'Detailed description of proposal 1',
    resources: [{ url: 'https://example.com/1', name: 'Resource 1' }],
  };

  const mockMetadata2: IProposalMetadata = {
    id: 2,
    title: 'Proposal 2',
    summary: 'Summary of proposal 2',
    description: 'Detailed description of proposal 2',
    resources: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'info').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should fetch and process proposals with metadata', async () => {
    const mockFetchAll = fetchAllPublicProposalsFromSubgraph as jest.MockedFunction<
      typeof fetchAllPublicProposalsFromSubgraph
    >;
    const mockGetIpfsFileSafe = getIpfsFileSafe as jest.MockedFunction<typeof getIpfsFileSafe>;

    mockFetchAll.mockResolvedValue(mockSubgraphProposals as any);
    mockGetIpfsFileSafe.mockResolvedValueOnce(mockMetadata1).mockResolvedValueOnce(mockMetadata2);

    const result = await getPublicProposalsFromSubgraph(mockConfig, true);

    expect(mockFetchAll).toHaveBeenCalledWith(mockConfig);
    expect(mockGetIpfsFileSafe).toHaveBeenCalledTimes(2);
    expect(mockGetIpfsFileSafe).toHaveBeenNthCalledWith(1, 'QmTest1234567890abcdef');
    expect(mockGetIpfsFileSafe).toHaveBeenNthCalledWith(2, 'QmTest9876543210fedcba');

    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({
      proposalId: '0x001',
      metadata: mockMetadata1,
      creator: 'Alice',
      startDate: new Date('2024-01-01T00:00:00.000Z'),
      endDate: new Date('2024-01-02T00:00:00.000Z'),
      creatorAddress: '0x1234567890123456789012345678901234567890',
      contractEventId: 'event-1',
      creationBlockNumber: 1000000n,
    });
    expect(result[1].metadata).toEqual(mockMetadata2);
    expect(result[2].metadata).toBeNull();
  });

  it('should fetch proposals without metadata when fetchMetadata is false', async () => {
    const mockFetchAll = fetchAllPublicProposalsFromSubgraph as jest.MockedFunction<
      typeof fetchAllPublicProposalsFromSubgraph
    >;
    const mockGetIpfsFileSafe = getIpfsFileSafe as jest.MockedFunction<typeof getIpfsFileSafe>;

    mockFetchAll.mockResolvedValue(mockSubgraphProposals as any);

    const result = await getPublicProposalsFromSubgraph(mockConfig, false);

    expect(mockFetchAll).toHaveBeenCalledWith(mockConfig);
    expect(mockGetIpfsFileSafe).not.toHaveBeenCalled();

    expect(result).toHaveLength(3);
    expect(result[0].metadata).toBeNull();
    expect(result[1].metadata).toBeNull();
    expect(result[2].metadata).toBeNull();
  });

  it('should use default fetchMetadata value of true', async () => {
    const mockFetchAll = fetchAllPublicProposalsFromSubgraph as jest.MockedFunction<
      typeof fetchAllPublicProposalsFromSubgraph
    >;
    const mockGetIpfsFileSafe = getIpfsFileSafe as jest.MockedFunction<typeof getIpfsFileSafe>;

    mockFetchAll.mockResolvedValue([mockSubgraphProposals[0]] as any);
    mockGetIpfsFileSafe.mockResolvedValue(mockMetadata1);

    const result = await getPublicProposalsFromSubgraph(mockConfig);

    expect(mockGetIpfsFileSafe).toHaveBeenCalled();
    expect(result[0].metadata).toEqual(mockMetadata1);
  });

  it('should handle empty proposals array', async () => {
    const mockFetchAll = fetchAllPublicProposalsFromSubgraph as jest.MockedFunction<
      typeof fetchAllPublicProposalsFromSubgraph
    >;

    mockFetchAll.mockResolvedValue([]);

    const result = await getPublicProposalsFromSubgraph(mockConfig, true);

    expect(result).toEqual([]);
    expect(console.info).toHaveBeenCalledWith('Found 0 proposals in subgraph');
  });

  it('should handle metadata fetch errors gracefully', async () => {
    const mockFetchAll = fetchAllPublicProposalsFromSubgraph as jest.MockedFunction<
      typeof fetchAllPublicProposalsFromSubgraph
    >;
    const mockGetIpfsFileSafe = getIpfsFileSafe as jest.MockedFunction<typeof getIpfsFileSafe>;

    mockFetchAll.mockResolvedValue([mockSubgraphProposals[0], mockSubgraphProposals[1]] as any);
    mockGetIpfsFileSafe.mockRejectedValueOnce(new Error('IPFS fetch failed')).mockResolvedValueOnce(mockMetadata2);

    const result = await getPublicProposalsFromSubgraph(mockConfig, true);

    expect(console.error).toHaveBeenCalledWith('Error parsing metadata:', expect.any(Error));
    expect(result[0].metadata).toBeNull();
    expect(result[1].metadata).toEqual(mockMetadata2);
  });

  it('should handle non-IPFS metadata URIs', async () => {
    const mockFetchAll = fetchAllPublicProposalsFromSubgraph as jest.MockedFunction<
      typeof fetchAllPublicProposalsFromSubgraph
    >;
    const mockGetIpfsFileSafe = getIpfsFileSafe as jest.MockedFunction<typeof getIpfsFileSafe>;

    const proposalWithHttpUri = {
      ...mockSubgraphProposals[0],
      metadata: 'https://example.com/metadata.json',
    };

    mockFetchAll.mockResolvedValue([proposalWithHttpUri] as any);

    const result = await getPublicProposalsFromSubgraph(mockConfig, true);

    expect(mockGetIpfsFileSafe).not.toHaveBeenCalled();
    expect(result[0].metadata).toBeNull();
  });

  it('should handle null or undefined metadata URIs', async () => {
    const mockFetchAll = fetchAllPublicProposalsFromSubgraph as jest.MockedFunction<
      typeof fetchAllPublicProposalsFromSubgraph
    >;

    const proposalsWithBadMetadata = [
      { ...mockSubgraphProposals[0], metadata: null },
      { ...mockSubgraphProposals[1], metadata: undefined },
      { ...mockSubgraphProposals[2], metadata: '' },
    ];

    mockFetchAll.mockResolvedValue(proposalsWithBadMetadata as any);

    const result = await getPublicProposalsFromSubgraph(mockConfig, true);

    expect(result).toHaveLength(3);
    expect(result[0].metadata).toBeNull();
    expect(result[1].metadata).toBeNull();
    expect(result[2].metadata).toBeNull();
  });

  it('should throw and log errors from fetchAllPublicProposalsFromSubgraph', async () => {
    const mockFetchAll = fetchAllPublicProposalsFromSubgraph as jest.MockedFunction<
      typeof fetchAllPublicProposalsFromSubgraph
    >;

    const error = new Error('Subgraph fetch failed');
    mockFetchAll.mockRejectedValue(error);

    await expect(getPublicProposalsFromSubgraph(mockConfig)).rejects.toThrow('Subgraph fetch failed');
    expect(console.error).toHaveBeenCalledWith('Error fetching public proposals from subgraph:', error);
  });

  it('should correctly convert timestamps to dates', async () => {
    const mockFetchAll = fetchAllPublicProposalsFromSubgraph as jest.MockedFunction<
      typeof fetchAllPublicProposalsFromSubgraph
    >;

    const proposalWithLargeTimestamp = {
      ...mockSubgraphProposals[0],
      startDate: '2147483647', // Max 32-bit timestamp
      endDate: '2147483648', // Beyond 32-bit
    };

    mockFetchAll.mockResolvedValue([proposalWithLargeTimestamp] as any);

    const result = await getPublicProposalsFromSubgraph(mockConfig, false);

    expect(result[0].startDate).toEqual(new Date(2147483647000));
    expect(result[0].endDate).toEqual(new Date(2147483648000));
  });

  it('should correctly convert block numbers to bigint', async () => {
    const mockFetchAll = fetchAllPublicProposalsFromSubgraph as jest.MockedFunction<
      typeof fetchAllPublicProposalsFromSubgraph
    >;

    const proposalWithLargeBlockNumber = {
      ...mockSubgraphProposals[0],
      creationBlockNumber: '9007199254740991', // Large number
    };

    mockFetchAll.mockResolvedValue([proposalWithLargeBlockNumber] as any);

    const result = await getPublicProposalsFromSubgraph(mockConfig, false);

    expect(result[0].creationBlockNumber).toBe(9007199254740991n);
    expect(typeof result[0].creationBlockNumber).toBe('bigint');
  });

  it('should fetch metadata in parallel', async () => {
    const mockFetchAll = fetchAllPublicProposalsFromSubgraph as jest.MockedFunction<
      typeof fetchAllPublicProposalsFromSubgraph
    >;
    const mockGetIpfsFileSafe = getIpfsFileSafe as jest.MockedFunction<typeof getIpfsFileSafe>;

    mockFetchAll.mockResolvedValue(mockSubgraphProposals.slice(0, 2) as any);

    // Create promises with different resolution times
    mockGetIpfsFileSafe
      .mockImplementationOnce(() => new Promise((resolve) => setTimeout(() => resolve(mockMetadata1), 50)))
      .mockImplementationOnce(() => new Promise((resolve) => setTimeout(() => resolve(mockMetadata2), 10)));

    const startTime = Date.now();
    const result = await getPublicProposalsFromSubgraph(mockConfig, true);
    const endTime = Date.now();

    // Should take roughly the max delay (50ms) if parallel
    expect(endTime - startTime).toBeLessThan(80);
    expect(result[0].metadata).toEqual(mockMetadata1);
    expect(result[1].metadata).toEqual(mockMetadata2);
  });
});
