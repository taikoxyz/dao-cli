import getPublicProposal from '../../../../src/api/dao/public-proposal/getPublicProposal';
import { getPublicClient } from '../../../../src/api/viem';
import getIpfsFile, { getIpfsFileSafe } from '../../../../src/api/ipfs/getIpfsFile';
import { INetworkConfig } from '../../../../src/types/network.type';
import { Address } from 'viem';

// Test types (commented out to fix linter warnings)
// interface MockPublicClient {
//   readContract: jest.Mock;
// }

jest.mock('../../../../src/api/viem');
jest.mock('../../../../src/api/ipfs/getIpfsFile');

describe('getPublicProposal', () => {
  const mockConfig: INetworkConfig = {
    network: 'mainnet',
    chainId: 1,
    contracts: {
      DAO: '0x0000000000000000000000000000000000000001' as Address,
      VotingToken: '0x0000000000000000000000000000000000000002' as Address,
      TaikoBridge: '0x0000000000000000000000000000000000000003' as Address,
      MultisigPlugin: '0x0000000000000000000000000000000000000004' as Address,
      EmergencyMultisigPlugin: '0x0000000000000000000000000000000000000005' as Address,
      OptimisticTokenVotingPlugin: '0x1234567890123456789012345678901234567890' as Address,
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

  const mockProposalData = [
    true, // executed
    10n, // approvals
    {
      votingMode: 1,
      earlyExecution: false,
      supportThreshold: 500000n,
      minVotingPower: 1000000000000000000n,
      snapshotTimestamp: 1234567890n,
      minDuration: 86400n,
      minProposerVotingPower: 1000000000000000000n,
    }, // parameters
    [], // actions
    '0x697066733a2f2f516d54657374313233', // metadataURI as hex for 'ipfs://QmTest123'
    '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd' as Address, // destinationPlugin
  ];

  const mockMetadata = {
    title: 'Test Proposal',
    summary: 'This is a test proposal',
    description: 'Detailed description of the test proposal',
    resources: [
      {
        url: 'https://example.com/resource',
        name: 'Resource 1',
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should fetch and return proposal data with metadata', async () => {
    const mockGetPublicClient = getPublicClient as jest.MockedFunction<typeof getPublicClient>;
    const mockGetIpfsFileSafe = getIpfsFileSafe as jest.MockedFunction<typeof getIpfsFileSafe>;

    const mockReadContract = jest
      .fn()
      .mockResolvedValueOnce('0x00000001') // proposalId
      .mockResolvedValueOnce(mockProposalData); // proposal data

    mockGetPublicClient.mockReturnValue({
      readContract: mockReadContract,
    } as any);

    mockGetIpfsFileSafe.mockResolvedValue(mockMetadata);

    const result = await getPublicProposal(0, mockConfig);

    expect(mockReadContract).toHaveBeenCalledTimes(2);
    expect(mockReadContract).toHaveBeenNthCalledWith(1, {
      abi: expect.any(Array) as unknown[],
      address: mockConfig.contracts.OptimisticTokenVotingPlugin,
      functionName: 'proposalIds',
      args: [0],
    });
    expect(mockReadContract).toHaveBeenNthCalledWith(2, {
      abi: expect.any(Array) as unknown[],
      address: mockConfig.contracts.OptimisticTokenVotingPlugin,
      functionName: 'getProposal',
      args: ['0x00000001'],
    });

    expect(mockGetIpfsFileSafe).toHaveBeenCalledWith('QmTest123');

    expect(result).toEqual({
      executed: true,
      approvals: 10n,
      parameters: mockProposalData[2],
      metadataURI: 'ipfs://QmTest123',
      destinationActions: '0x697066733a2f2f516d54657374313233',
      destinationPlugin: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      proposalId: '0x00000001',
      ...mockMetadata,
    });
  });

  it('should handle IPFS URI without ipfs:// prefix', async () => {
    const mockGetPublicClient = getPublicClient as jest.MockedFunction<typeof getPublicClient>;
    const mockGetIpfsFileSafe = getIpfsFileSafe as jest.MockedFunction<typeof getIpfsFileSafe>;

    const proposalDataWithoutPrefix = [
      ...mockProposalData.slice(0, 4),
      '0x516d54657374313233', // hex for 'QmTest123' without ipfs:// prefix
      mockProposalData[5],
    ];

    const mockReadContract = jest
      .fn()
      .mockResolvedValueOnce('0x00000002')
      .mockResolvedValueOnce(proposalDataWithoutPrefix);

    mockGetPublicClient.mockReturnValue({
      readContract: mockReadContract,
    } as any);

    mockGetIpfsFileSafe.mockResolvedValue(mockMetadata);

    const result = await getPublicProposal(1, mockConfig);

    expect(mockGetIpfsFileSafe).toHaveBeenCalledWith('QmTest123');
    expect(result?.metadataURI).toBe('QmTest123');
  });

  it('should handle errors and log them', async () => {
    const mockGetPublicClient = getPublicClient as jest.MockedFunction<typeof getPublicClient>;

    const mockReadContract = jest.fn().mockRejectedValue(new Error('Contract read failed'));

    mockGetPublicClient.mockReturnValue({
      readContract: mockReadContract,
    } as any);

    const result = await getPublicProposal(2, mockConfig);

    expect(console.error).toHaveBeenCalledWith('Error fetching public proposal 2:', expect.any(Error) as Error);
    expect(console.error).toHaveBeenCalledWith(expect.any(Error) as Error);
    expect(result).toBeUndefined();
  });

  it('should handle IPFS fetch errors gracefully', async () => {
    const mockGetPublicClient = getPublicClient as jest.MockedFunction<typeof getPublicClient>;
    const mockGetIpfsFileSafe = getIpfsFileSafe as jest.MockedFunction<typeof getIpfsFileSafe>;

    const mockReadContract = jest.fn().mockResolvedValueOnce('0x00000003').mockResolvedValueOnce(mockProposalData);

    mockGetPublicClient.mockReturnValue({
      readContract: mockReadContract,
    } as any);

    mockGetIpfsFileSafe.mockResolvedValue(null); // IPFS fetch failed but returns null gracefully

    const result = await getPublicProposal(3, mockConfig);

    expect(result).toBeDefined(); // Should return proposal data without metadata
    expect(result?.metadataURI).toBe('ipfs://QmTest123');
    expect(result?.title).toBe('Public Proposal 3'); // Fallback title when metadata fails
  });

  it('should handle different proposal counts', async () => {
    const mockGetPublicClient = getPublicClient as jest.MockedFunction<typeof getPublicClient>;
    const mockGetIpfsFile = getIpfsFile as jest.MockedFunction<typeof getIpfsFile>;

    const mockReadContract = jest
      .fn()
      .mockResolvedValueOnce('0x0000000A') // proposalId for count 10
      .mockResolvedValueOnce(mockProposalData);

    mockGetPublicClient.mockReturnValue({
      readContract: mockReadContract,
    } as any);

    mockGetIpfsFile.mockResolvedValue(mockMetadata);

    const result = await getPublicProposal(10, mockConfig);

    expect(mockReadContract).toHaveBeenNthCalledWith(1, {
      abi: expect.any(Array) as unknown[],
      address: mockConfig.contracts.OptimisticTokenVotingPlugin,
      functionName: 'proposalIds',
      args: [10],
    });
    expect(result?.proposalId).toBe('0x0000000A');
  });
});
