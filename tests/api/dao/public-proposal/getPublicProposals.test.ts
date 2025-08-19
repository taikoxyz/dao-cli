import getPublicProposals from '../../../../src/api/dao/public-proposal/getPublicProposals';
import getPublicProposal from '../../../../src/api/dao/public-proposal/getPublicProposal';
import { getPublicClient } from '../../../../src/api/viem';
import { ABIs } from '../../../../src/abi';
import { INetworkConfig } from '../../../../src/types/network.type';

// Mock dependencies
jest.mock('../../../../src/api/dao/public-proposal/getPublicProposal');
jest.mock('../../../../src/api/viem');
jest.mock('../../../../src/abi');

const mockGetPublicProposal = getPublicProposal as jest.MockedFunction<typeof getPublicProposal>;
const mockGetPublicClient = getPublicClient as jest.MockedFunction<typeof getPublicClient>;

describe('getPublicProposals', () => {
  let mockConfig: INetworkConfig;
  let mockClient: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock console methods
    jest.spyOn(console, 'info').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();

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

    mockClient = {
      readContract: jest.fn(),
    };

    mockGetPublicClient.mockReturnValue(mockClient);

    // Mock ABIs
    (ABIs as any) = {
      OptimisticTokenVotingPlugin: [
        {
          name: 'proposalCount',
          type: 'function',
          inputs: [],
          outputs: [{ name: '', type: 'uint256' }],
          stateMutability: 'view',
        },
      ],
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('successful proposal fetching', () => {
    it('should fetch and return public proposals', async () => {
      const proposalCount = 3n;
      const mockProposals: any[] = [
        {
          id: 0,
          title: 'Proposal 1',
          description: 'Description 1',
          executed: false,
          approvals: [],
          parameters: {},
          metadataURI: 'ipfs://test1',
          actions: [],
          proposalId: [0],
        },
        {
          id: 1,
          title: 'Proposal 2',
          description: 'Description 2',
          executed: false,
          approvals: [],
          parameters: {},
          metadataURI: 'ipfs://test2',
          actions: [],
          proposalId: [1],
        },
        {
          id: 2,
          title: 'Proposal 3',
          description: 'Description 3',
          executed: false,
          approvals: [],
          parameters: {},
          metadataURI: 'ipfs://test3',
          actions: [],
          proposalId: [2],
        },
      ];

      mockClient.readContract.mockResolvedValue(proposalCount);
      mockGetPublicProposal
        .mockResolvedValueOnce(mockProposals[0] as any)
        .mockResolvedValueOnce(mockProposals[1] as any)
        .mockResolvedValueOnce(mockProposals[2] as any);

      const result = await getPublicProposals(mockConfig);

      expect(mockGetPublicClient).toHaveBeenCalledWith(mockConfig);
      expect(mockClient.readContract).toHaveBeenCalledWith({
        abi: ABIs.OptimisticTokenVotingPlugin,
        address: mockConfig.contracts.OptimisticTokenVotingPlugin,
        functionName: 'proposalCount',
        args: [],
      });
      expect(console.info).toHaveBeenCalledWith(`Public proposal count: ${proposalCount}`);
      expect(mockGetPublicProposal).toHaveBeenCalledTimes(3);
      expect(mockGetPublicProposal).toHaveBeenNthCalledWith(1, 0, mockConfig);
      expect(mockGetPublicProposal).toHaveBeenNthCalledWith(2, 1, mockConfig);
      expect(mockGetPublicProposal).toHaveBeenNthCalledWith(3, 2, mockConfig);
      expect(result).toEqual([mockProposals[2], mockProposals[1], mockProposals[0]]); // reversed
    });

    it('should handle zero proposals', async () => {
      const proposalCount = 0n;

      mockClient.readContract.mockResolvedValue(proposalCount);

      const result = await getPublicProposals(mockConfig);

      expect(mockClient.readContract).toHaveBeenCalled();
      expect(console.info).toHaveBeenCalledWith(`Public proposal count: ${proposalCount}`);
      expect(mockGetPublicProposal).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    it('should handle single proposal', async () => {
      const proposalCount = 1n;
      const mockProposal: any = {
        id: 0,
        title: 'Single Proposal',
        description: 'Single Description',
        executed: false,
        approvals: [],
        parameters: {},
        metadataURI: 'ipfs://single',
        actions: [],
        proposalId: [0],
      };

      mockClient.readContract.mockResolvedValue(proposalCount);
      mockGetPublicProposal.mockResolvedValue(mockProposal as any);

      const result = await getPublicProposals(mockConfig);

      expect(mockGetPublicProposal).toHaveBeenCalledTimes(1);
      expect(mockGetPublicProposal).toHaveBeenCalledWith(0, mockConfig);
      expect(result).toEqual([mockProposal]);
    });

    it('should filter out undefined proposals', async () => {
      const proposalCount = 4n;
      const mockProposals = [
        {
          id: 0,
          title: 'Proposal 1',
          description: 'Description 1',
          executed: false,
          approvals: [],
          parameters: {},
          metadataURI: 'ipfs://test1',
          actions: [],
          proposalId: [0],
        },
        undefined, // This should be filtered out
        {
          id: 2,
          title: 'Proposal 3',
          description: 'Description 3',
          executed: false,
          approvals: [],
          parameters: {},
          metadataURI: 'ipfs://test3',
          actions: [],
          proposalId: [2],
        },
        undefined, // This should be filtered out
      ];

      mockClient.readContract.mockResolvedValue(proposalCount);
      mockGetPublicProposal
        .mockResolvedValueOnce(mockProposals[0] as any)
        .mockResolvedValueOnce(mockProposals[1] as any)
        .mockResolvedValueOnce(mockProposals[2] as any)
        .mockResolvedValueOnce(mockProposals[3] as any);

      const result = await getPublicProposals(mockConfig);

      expect(result).toEqual([mockProposals[2], mockProposals[0]]); // reversed, undefined filtered out
      expect(result).toHaveLength(2);
    });

    it('should reverse the order of proposals', async () => {
      const proposalCount = 3n;
      const mockProposals = [
        {
          id: 0,
          title: 'First',
          description: 'First proposal',
          executed: false,
          approvals: [],
          parameters: {},
          metadataURI: 'ipfs://first',
          actions: [],
          proposalId: [0],
        },
        {
          id: 1,
          title: 'Second',
          description: 'Second proposal',
          executed: false,
          approvals: [],
          parameters: {},
          metadataURI: 'ipfs://second',
          actions: [],
          proposalId: [1],
        },
        {
          id: 2,
          title: 'Third',
          description: 'Third proposal',
          executed: false,
          approvals: [],
          parameters: {},
          metadataURI: 'ipfs://third',
          actions: [],
          proposalId: [2],
        },
      ];

      mockClient.readContract.mockResolvedValue(proposalCount);
      mockGetPublicProposal
        .mockResolvedValueOnce(mockProposals[0] as any)
        .mockResolvedValueOnce(mockProposals[1] as any)
        .mockResolvedValueOnce(mockProposals[2] as any);

      const result = await getPublicProposals(mockConfig);

      expect(result).toEqual([
        mockProposals[2], // Third -> First
        mockProposals[1], // Second -> Second
        mockProposals[0], // First -> Third
      ]);
    });
  });

  describe('error handling', () => {
    it('should handle contract read errors', async () => {
      const contractError = new Error('Contract call failed');
      mockClient.readContract.mockRejectedValue(contractError);

      const result = await getPublicProposals(mockConfig);

      expect(console.error).toHaveBeenCalledWith(contractError);
      expect(result).toBeUndefined();
    });

    it('should handle individual proposal fetch errors', async () => {
      const proposalCount = 3n;
      const mockProposals = [
        {
          id: 0,
          title: 'Proposal 1',
          description: 'Description 1',
          executed: false,
          approvals: [],
          parameters: {},
          metadataURI: 'ipfs://test1',
          actions: [],
          proposalId: [0],
        },
        undefined, // Simulate error by returning undefined
        {
          id: 2,
          title: 'Proposal 3',
          description: 'Description 3',
          executed: false,
          approvals: [],
          parameters: {},
          metadataURI: 'ipfs://test3',
          actions: [],
          proposalId: [2],
        },
      ];

      mockClient.readContract.mockResolvedValue(proposalCount);
      mockGetPublicProposal
        .mockResolvedValueOnce(mockProposals[0] as any)
        .mockResolvedValueOnce(mockProposals[1] as any)
        .mockResolvedValueOnce(mockProposals[2] as any);

      const result = await getPublicProposals(mockConfig);

      // Should still return successful proposals, filtering out failed ones
      expect(result).toEqual([mockProposals[2], mockProposals[0]]);
    });

    it('should handle network errors', async () => {
      const networkError = new Error('Network connection failed');
      mockClient.readContract.mockRejectedValue(networkError);

      const result = await getPublicProposals(mockConfig);

      expect(console.error).toHaveBeenCalledWith(networkError);
      expect(result).toBeUndefined();
    });

    it('should handle all proposal fetches failing', async () => {
      const proposalCount = 2n;

      mockClient.readContract.mockResolvedValue(proposalCount);
      mockGetPublicProposal.mockResolvedValueOnce(undefined).mockResolvedValueOnce(undefined);

      const result = await getPublicProposals(mockConfig);

      expect(result).toEqual([]);
    });
  });

  describe('proposal count handling', () => {
    it('should handle large proposal count', async () => {
      const proposalCount = 100n;
      const mockProposal: any = {
        id: 0,
        title: 'Proposal',
        description: 'Description',
        executed: false,
        approvals: [],
        parameters: {},
        metadataURI: 'ipfs://large',
        actions: [],
        proposalId: [0],
      };

      mockClient.readContract.mockResolvedValue(proposalCount);
      mockGetPublicProposal.mockResolvedValue(mockProposal as any);

      const result = await getPublicProposals(mockConfig);

      expect(mockGetPublicProposal).toHaveBeenCalledTimes(100);
      expect(result).toHaveLength(100);
    });

    it('should convert BigInt proposal count to number correctly', async () => {
      const proposalCount = 5n;

      mockClient.readContract.mockResolvedValue(proposalCount);
      mockGetPublicProposal.mockResolvedValue({ id: 0, title: 'Test' } as any);

      await getPublicProposals(mockConfig);

      expect(mockGetPublicProposal).toHaveBeenCalledTimes(5);
      // Verify the indices are correct
      for (let i = 0; i < 5; i++) {
        expect(mockGetPublicProposal).toHaveBeenCalledWith(i, mockConfig);
      }
    });

    it('should handle string representation of proposal count', async () => {
      const proposalCount = '10'; // Some contracts might return string
      const mockProposal: any = {
        id: 0,
        title: 'Proposal',
        description: 'Description',
        executed: false,
        approvals: [],
        parameters: {},
        metadataURI: 'ipfs://string',
        actions: [],
        proposalId: [0],
      };

      mockClient.readContract.mockResolvedValue(proposalCount);
      mockGetPublicProposal.mockResolvedValue(mockProposal as any);

      const result = await getPublicProposals(mockConfig);

      expect(mockGetPublicProposal).toHaveBeenCalledTimes(10);
      expect(result).toHaveLength(10);
    });
  });

  describe('concurrent proposal fetching', () => {
    it('should fetch all proposals concurrently', async () => {
      const proposalCount = 3n;
      const mockProposals = [
        {
          id: 0,
          title: 'Proposal 1',
          executed: false,
          approvals: [],
          parameters: {},
          metadataURI: 'ipfs://concurrent1',
          actions: [],
          proposalId: [0],
        },
        {
          id: 1,
          title: 'Proposal 2',
          executed: false,
          approvals: [],
          parameters: {},
          metadataURI: 'ipfs://concurrent2',
          actions: [],
          proposalId: [1],
        },
        {
          id: 2,
          title: 'Proposal 3',
          executed: false,
          approvals: [],
          parameters: {},
          metadataURI: 'ipfs://concurrent3',
          actions: [],
          proposalId: [2],
        },
      ];

      mockClient.readContract.mockResolvedValue(proposalCount);

      // Simulate different response times
      mockGetPublicProposal
        .mockImplementationOnce(() => new Promise((resolve) => setTimeout(() => resolve(mockProposals[0] as any), 100)))
        .mockImplementationOnce(() => new Promise((resolve) => setTimeout(() => resolve(mockProposals[1] as any), 50)))
        .mockImplementationOnce(() => new Promise((resolve) => setTimeout(() => resolve(mockProposals[2] as any), 10)));

      const startTime = Date.now();
      const result = await getPublicProposals(mockConfig);
      const endTime = Date.now();

      // Should complete in roughly 100ms (the longest), not 160ms (sum of all)
      expect(endTime - startTime).toBeLessThan(150);
      expect(result).toHaveLength(3);
    });
  });

  describe('integration scenarios', () => {
    it('should work with real-like proposal data', async () => {
      const proposalCount = 2n;
      const mockProposals = [
        {
          id: 0,
          title: 'Treasury Allocation Proposal',
          description: 'Allocate funds for development',
          creator: '0x1234567890abcdef1234567890abcdef12345678',
          startDate: 1672531200,
          endDate: 1672617600,
          executed: false,
        },
        {
          id: 1,
          title: 'Governance Parameter Update',
          description: 'Update voting duration parameters',
          creator: '0xabcdef1234567890abcdef1234567890abcdef12',
          startDate: 1672704000,
          endDate: 1672790400,
          executed: false,
        },
      ];

      mockClient.readContract.mockResolvedValue(proposalCount);
      mockGetPublicProposal
        .mockResolvedValueOnce(mockProposals[0] as any)
        .mockResolvedValueOnce(mockProposals[1] as any);

      const result = await getPublicProposals(mockConfig);

      expect(result).toEqual([mockProposals[1], mockProposals[0]]); // reversed order
      expect(result).toBeTruthy();
      if (result && result.length >= 2) {
        expect(result[0].title).toBe('Governance Parameter Update');
        expect(result[1].title).toBe('Treasury Allocation Proposal');
      }
    });

    it('should handle mixed success/failure scenarios', async () => {
      const proposalCount = 4n;
      const successfulProposals = [
        {
          id: 0,
          title: 'Successful Proposal 1',
          executed: false,
          approvals: [],
          parameters: {},
          metadataURI: 'ipfs://success1',
          actions: [],
          proposalId: [0],
        },
        {
          id: 2,
          title: 'Successful Proposal 2',
          executed: false,
          approvals: [],
          parameters: {},
          metadataURI: 'ipfs://success2',
          actions: [],
          proposalId: [2],
        },
      ];

      mockClient.readContract.mockResolvedValue(proposalCount);
      mockGetPublicProposal
        .mockResolvedValueOnce(successfulProposals[0] as any)
        .mockResolvedValueOnce(undefined) // Failed
        .mockResolvedValueOnce(successfulProposals[1] as any)
        .mockResolvedValueOnce(undefined); // Failed

      const result = await getPublicProposals(mockConfig);

      expect(result).toEqual([successfulProposals[1], successfulProposals[0]]);
      expect(result).toHaveLength(2);
    });
  });
});
