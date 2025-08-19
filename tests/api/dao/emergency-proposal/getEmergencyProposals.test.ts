import getEmergencyProposals from '../../../../src/api/dao/emergency-proposal/getEmergencyProposals';
import getEmergencyProposal from '../../../../src/api/dao/emergency-proposal/getEmergencyProposal';
import { getPublicClient } from '../../../../src/api/viem';
import { INetworkConfig } from '../../../../src/types/network.type';
import { Address } from 'viem';
// Removed unused imports: MockPublicClient, MockProposal

// Test types (commented out to fix linter warnings)
// interface MockPublicClient {
//   readContract: jest.Mock;
// }

// interface MockEmergencyProposal {
//   id: number;
//   title: string;
//   executed: boolean;
//   approvals: number;
//   proposalId?: number;
// }

jest.mock('../../../../src/api/viem');
jest.mock('../../../../src/api/dao/emergency-proposal/getEmergencyProposal');

describe('getEmergencyProposals', () => {
  const mockConfig: INetworkConfig = {
    network: 'mainnet',
    chainId: 1,
    contracts: {
      DAO: '0x0000000000000000000000000000000000000001' as Address,
      VotingToken: '0x0000000000000000000000000000000000000002' as Address,
      TaikoBridge: '0x0000000000000000000000000000000000000003' as Address,
      MultisigPlugin: '0x0000000000000000000000000000000000000004' as Address,
      EmergencyMultisigPlugin: '0x1234567890123456789012345678901234567890' as Address,
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

  it('should fetch all emergency proposals and return them in reverse order', async () => {
    const mockGetPublicClient = getPublicClient as jest.MockedFunction<typeof getPublicClient>;
    const mockGetEmergencyProposal = getEmergencyProposal as jest.MockedFunction<typeof getEmergencyProposal>;

    const mockReadContract = jest.fn().mockResolvedValue(3n);
    mockGetPublicClient.mockReturnValue({
      readContract: mockReadContract,
    } as any);

    const mockProposals = [
      { id: 0, title: 'Emergency 0', executed: false, approvals: 2 },
      { id: 1, title: 'Emergency 1', executed: true, approvals: 3 },
      { id: 2, title: 'Emergency 2', executed: false, approvals: 1 },
    ];

    mockGetEmergencyProposal
      .mockResolvedValueOnce(mockProposals[0] as any)
      .mockResolvedValueOnce(mockProposals[1] as any)
      .mockResolvedValueOnce(mockProposals[2] as any);

    const result = await getEmergencyProposals(mockConfig);

    expect(mockReadContract).toHaveBeenCalledWith({
      abi: expect.any(Array) as any[],
      address: mockConfig.contracts.EmergencyMultisigPlugin,
      functionName: 'proposalCount',
      args: [],
    });

    expect(mockGetEmergencyProposal).toHaveBeenCalledTimes(3);
    expect(mockGetEmergencyProposal).toHaveBeenNthCalledWith(1, 0, mockConfig);
    expect(mockGetEmergencyProposal).toHaveBeenNthCalledWith(2, 1, mockConfig);
    expect(mockGetEmergencyProposal).toHaveBeenNthCalledWith(3, 2, mockConfig);

    expect(console.info).toHaveBeenCalledWith('Emergency proposal count: 3');

    expect(result).toEqual([mockProposals[2], mockProposals[1], mockProposals[0]]);
  });

  it('should filter out undefined proposals', async () => {
    const mockGetPublicClient = getPublicClient as jest.MockedFunction<typeof getPublicClient>;
    const mockGetEmergencyProposal = getEmergencyProposal as jest.MockedFunction<typeof getEmergencyProposal>;

    const mockReadContract = jest.fn().mockResolvedValue(5n);
    mockGetPublicClient.mockReturnValue({
      readContract: mockReadContract,
    } as any);

    mockGetEmergencyProposal
      .mockResolvedValueOnce({ proposalId: 0, title: 'Emergency 0' } as any)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({ proposalId: 2, title: 'Emergency 2' } as any)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({ id: 4, title: 'Emergency 4' } as any);

    const result = await getEmergencyProposals(mockConfig);

    expect(mockGetEmergencyProposal).toHaveBeenCalledTimes(5);
    expect(result).toEqual([
      { id: 4, title: 'Emergency 4' },
      { proposalId: 2, title: 'Emergency 2' },
      { proposalId: 0, title: 'Emergency 0' },
    ]);
  });

  it('should handle zero proposals', async () => {
    const mockGetPublicClient = getPublicClient as jest.MockedFunction<typeof getPublicClient>;
    const mockGetEmergencyProposal = getEmergencyProposal as jest.MockedFunction<typeof getEmergencyProposal>;

    const mockReadContract = jest.fn().mockResolvedValue(0n);
    mockGetPublicClient.mockReturnValue({
      readContract: mockReadContract,
    } as any);

    const result = await getEmergencyProposals(mockConfig);

    expect(mockGetEmergencyProposal).not.toHaveBeenCalled();
    expect(console.info).toHaveBeenCalledWith('Emergency proposal count: 0');
    expect(result).toEqual([]);
  });

  it('should handle large number of proposals', async () => {
    const mockGetPublicClient = getPublicClient as jest.MockedFunction<typeof getPublicClient>;
    const mockGetEmergencyProposal = getEmergencyProposal as jest.MockedFunction<typeof getEmergencyProposal>;

    const mockReadContract = jest.fn().mockResolvedValue(50n);
    mockGetPublicClient.mockReturnValue({
      readContract: mockReadContract,
    } as any);

    // Mock all 50 proposals
    for (let i = 0; i < 50; i++) {
      mockGetEmergencyProposal.mockResolvedValueOnce({
        id: i,
        title: `Emergency ${i}`,
        executed: i % 2 === 0,
        approvals: i % 3,
      } as any);
    }

    const result = await getEmergencyProposals(mockConfig);

    expect(mockGetEmergencyProposal).toHaveBeenCalledTimes(50);
    expect(result).toHaveLength(50);
    expect(result?.[0]).toEqual({ id: 49, title: 'Emergency 49', executed: false, approvals: 1 });
    expect(result?.[49]).toEqual({ id: 0, title: 'Emergency 0', executed: true, approvals: 0 });
  });

  it('should handle errors and log them', async () => {
    const mockGetPublicClient = getPublicClient as jest.MockedFunction<typeof getPublicClient>;

    const mockReadContract = jest.fn().mockRejectedValue(new Error('Contract read failed'));
    mockGetPublicClient.mockReturnValue({
      readContract: mockReadContract,
    } as any);

    const result = await getEmergencyProposals(mockConfig);

    expect(console.error).toHaveBeenCalledWith(expect.any(Error) as Error);
    expect(result).toBeUndefined();
  });

  it('should handle errors in individual proposal fetches gracefully', async () => {
    const mockGetPublicClient = getPublicClient as jest.MockedFunction<typeof getPublicClient>;
    const mockGetEmergencyProposal = getEmergencyProposal as jest.MockedFunction<typeof getEmergencyProposal>;

    const mockReadContract = jest.fn().mockResolvedValue(3n);
    mockGetPublicClient.mockReturnValue({
      readContract: mockReadContract,
    } as any);

    mockGetEmergencyProposal
      .mockResolvedValueOnce({ proposalId: 0, title: 'Emergency 0' } as any)
      .mockRejectedValueOnce(new Error('Proposal fetch failed'))
      .mockResolvedValueOnce({ proposalId: 2, title: 'Emergency 2' } as any);

    const result = await getEmergencyProposals(mockConfig);

    // Promise.all will reject if any promise rejects
    expect(console.error).toHaveBeenCalled();
    expect(result).toBeUndefined();
  });

  it('should fetch proposals in parallel using Promise.all', async () => {
    const mockGetPublicClient = getPublicClient as jest.MockedFunction<typeof getPublicClient>;
    const mockGetEmergencyProposal = getEmergencyProposal as jest.MockedFunction<typeof getEmergencyProposal>;

    const mockReadContract = jest.fn().mockResolvedValue(4n);
    mockGetPublicClient.mockReturnValue({
      readContract: mockReadContract,
    } as any);

    // Create promises with different resolution times to verify parallel execution
    const delays = [40, 10, 25, 5];
    delays.forEach((delay, index) => {
      mockGetEmergencyProposal.mockImplementationOnce(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  proposalId: index,
                  title: `Emergency ${index}`,
                  executed: false,
                  approvals: 1,
                } as any),
              delay,
            ),
          ),
      );
    });

    const startTime = Date.now();
    const result = await getEmergencyProposals(mockConfig);
    const endTime = Date.now();

    // Parallel execution should take roughly the max delay (40ms) plus overhead
    // Sequential would take sum of delays (80ms)
    expect(endTime - startTime).toBeLessThan(70);
    expect(result).toHaveLength(4);
    expect(result?.[0]?.proposalId).toBe(3);
    expect(result?.[3]?.proposalId).toBe(0);
  });

  it('should handle bigint conversion properly', async () => {
    const mockGetPublicClient = getPublicClient as jest.MockedFunction<typeof getPublicClient>;
    const mockGetEmergencyProposal = getEmergencyProposal as jest.MockedFunction<typeof getEmergencyProposal>;

    // Test with a reasonable bigint value
    const mockReadContract = jest.fn().mockResolvedValue(BigInt('3'));
    mockGetPublicClient.mockReturnValue({
      readContract: mockReadContract,
    } as any);

    // Mock the 3 proposals
    for (let i = 0; i < 3; i++) {
      mockGetEmergencyProposal.mockResolvedValueOnce({
        id: i,
        title: `Emergency ${i}`,
      } as any);
    }

    const result = await getEmergencyProposals(mockConfig);

    // The function converts BigInt to Number properly
    expect(mockGetEmergencyProposal).toHaveBeenCalledTimes(3);
    expect(result).toHaveLength(3);
  });
});
