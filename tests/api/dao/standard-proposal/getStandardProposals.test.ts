import getStandardProposals from '../../../../src/api/dao/standard-proposal/getStandardProposals';
import getStandardProposal from '../../../../src/api/dao/standard-proposal/getStandardProposal';
import { getPublicClient } from '../../../../src/api/viem';
import { INetworkConfig } from '../../../../src/types/network.type';
import { Address } from 'viem';

jest.mock('../../../../src/api/viem');
jest.mock('../../../../src/api/dao/standard-proposal/getStandardProposal');

describe('getStandardProposals', () => {
  const mockConfig: INetworkConfig = {
    network: 'mainnet',
    contracts: {
      DAO: '0x0000000000000000000000000000000000000001' as Address,
      VotingToken: '0x0000000000000000000000000000000000000002' as Address,
      TaikoBridge: '0x0000000000000000000000000000000000000003' as Address,
      MultisigPlugin: '0x1234567890123456789012345678901234567890' as Address,
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

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'info').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should fetch all standard proposals and return them in reverse order', async () => {
    const mockGetPublicClient = getPublicClient as jest.MockedFunction<typeof getPublicClient>;
    const mockGetStandardProposal = getStandardProposal as jest.MockedFunction<typeof getStandardProposal>;

    const mockReadContract = jest.fn().mockResolvedValue(3n);
    mockGetPublicClient.mockReturnValue({
      readContract: mockReadContract,
    } as any);

    const mockProposals = [
      { id: 0, title: 'Proposal 0', executed: false },
      { id: 1, title: 'Proposal 1', executed: true },
      { id: 2, title: 'Proposal 2', executed: false },
    ];

    mockGetStandardProposal
      .mockResolvedValueOnce(mockProposals[0] as any)
      .mockResolvedValueOnce(mockProposals[1] as any)
      .mockResolvedValueOnce(mockProposals[2] as any);

    const result = await getStandardProposals(mockConfig);

    expect(mockReadContract).toHaveBeenCalledWith({
      abi: expect.any(Array),
      address: mockConfig.contracts.MultisigPlugin,
      functionName: 'proposalCount',
      args: [],
    });

    expect(mockGetStandardProposal).toHaveBeenCalledTimes(3);
    expect(mockGetStandardProposal).toHaveBeenNthCalledWith(1, 0, mockConfig);
    expect(mockGetStandardProposal).toHaveBeenNthCalledWith(2, 1, mockConfig);
    expect(mockGetStandardProposal).toHaveBeenNthCalledWith(3, 2, mockConfig);

    expect(console.info).toHaveBeenCalledWith('Standard proposal count: 3');

    expect(result).toEqual([mockProposals[2], mockProposals[1], mockProposals[0]]);
  });

  it('should filter out undefined proposals', async () => {
    const mockGetPublicClient = getPublicClient as jest.MockedFunction<typeof getPublicClient>;
    const mockGetStandardProposal = getStandardProposal as jest.MockedFunction<typeof getStandardProposal>;

    const mockReadContract = jest.fn().mockResolvedValue(4n);
    mockGetPublicClient.mockReturnValue({
      readContract: mockReadContract,
    } as any);

    mockGetStandardProposal
      .mockResolvedValueOnce({ id: 0, title: 'Proposal 0' } as any)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({ id: 2, title: 'Proposal 2' } as any)
      .mockResolvedValueOnce(undefined);

    const result = await getStandardProposals(mockConfig);

    expect(mockGetStandardProposal).toHaveBeenCalledTimes(4);
    expect(result).toEqual([
      { id: 2, title: 'Proposal 2' },
      { id: 0, title: 'Proposal 0' },
    ]);
  });

  it('should handle zero proposals', async () => {
    const mockGetPublicClient = getPublicClient as jest.MockedFunction<typeof getPublicClient>;
    const mockGetStandardProposal = getStandardProposal as jest.MockedFunction<typeof getStandardProposal>;

    const mockReadContract = jest.fn().mockResolvedValue(0n);
    mockGetPublicClient.mockReturnValue({
      readContract: mockReadContract,
    } as any);

    const result = await getStandardProposals(mockConfig);

    expect(mockGetStandardProposal).not.toHaveBeenCalled();
    expect(console.info).toHaveBeenCalledWith('Standard proposal count: 0');
    expect(result).toEqual([]);
  });

  it('should handle large number of proposals', async () => {
    const mockGetPublicClient = getPublicClient as jest.MockedFunction<typeof getPublicClient>;
    const mockGetStandardProposal = getStandardProposal as jest.MockedFunction<typeof getStandardProposal>;

    const mockReadContract = jest.fn().mockResolvedValue(100n);
    mockGetPublicClient.mockReturnValue({
      readContract: mockReadContract,
    } as any);

    // Mock all 100 proposals
    for (let i = 0; i < 100; i++) {
      mockGetStandardProposal.mockResolvedValueOnce({ id: i, title: `Proposal ${i}` } as any);
    }

    const result = await getStandardProposals(mockConfig);

    expect(mockGetStandardProposal).toHaveBeenCalledTimes(100);
    expect(result).toHaveLength(100);
    expect(result![0]).toEqual({ id: 99, title: 'Proposal 99' });
    expect(result![99]).toEqual({ id: 0, title: 'Proposal 0' });
  });

  it('should handle errors and log them', async () => {
    const mockGetPublicClient = getPublicClient as jest.MockedFunction<typeof getPublicClient>;

    const mockReadContract = jest.fn().mockRejectedValue(new Error('Contract read failed'));
    mockGetPublicClient.mockReturnValue({
      readContract: mockReadContract,
    } as any);

    const result = await getStandardProposals(mockConfig);

    expect(console.error).toHaveBeenCalledWith(expect.any(Error));
    expect(result).toBeUndefined();
  });

  it('should handle errors in individual proposal fetches', async () => {
    const mockGetPublicClient = getPublicClient as jest.MockedFunction<typeof getPublicClient>;
    const mockGetStandardProposal = getStandardProposal as jest.MockedFunction<typeof getStandardProposal>;

    const mockReadContract = jest.fn().mockResolvedValue(3n);
    mockGetPublicClient.mockReturnValue({
      readContract: mockReadContract,
    } as any);

    mockGetStandardProposal
      .mockResolvedValueOnce({ id: 0, title: 'Proposal 0' } as any)
      .mockRejectedValueOnce(new Error('Proposal fetch failed'))
      .mockResolvedValueOnce({ id: 2, title: 'Proposal 2' } as any);

    const result = await getStandardProposals(mockConfig);

    // The Promise.all should reject if any promise rejects
    expect(console.error).toHaveBeenCalled();
    expect(result).toBeUndefined();
  });

  it('should use Promise.all for parallel fetching', async () => {
    const mockGetPublicClient = getPublicClient as jest.MockedFunction<typeof getPublicClient>;
    const mockGetStandardProposal = getStandardProposal as jest.MockedFunction<typeof getStandardProposal>;

    const mockReadContract = jest.fn().mockResolvedValue(5n);
    mockGetPublicClient.mockReturnValue({
      readContract: mockReadContract,
    } as any);

    // Create promises that resolve at different times to test parallelism
    const delays = [50, 10, 30, 5, 20];
    delays.forEach((delay, index) => {
      mockGetStandardProposal.mockImplementationOnce(
        () =>
          new Promise((resolve) => setTimeout(() => resolve({ id: index, title: `Proposal ${index}` } as any), delay)),
      );
    });

    const startTime = Date.now();
    const result = await getStandardProposals(mockConfig);
    const endTime = Date.now();

    // If executed in parallel, should take roughly the max delay (50ms) plus some overhead
    // If executed sequentially, would take sum of delays (115ms)
    expect(endTime - startTime).toBeLessThan(100);
    expect(result).toHaveLength(5);
  });
});
