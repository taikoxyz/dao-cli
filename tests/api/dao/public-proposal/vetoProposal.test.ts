import { WalletClient, PublicClient } from 'viem';
import {
  vetoProposal,
  canVetoProposal,
  hasVetoedProposal,
  isMinVetoRatioReached,
  getMinVetoRatio,
} from '../../../../src/api/dao/public-proposal/vetoProposal';
import { INetworkConfig } from '../../../../src/types/network.type';

// Mock the ABIs
jest.mock('../../../../src/abi', () => ({
  ABIs: {
    OptimisticTokenVotingPlugin: [],
  },
}));

describe('vetoProposal', () => {
  let mockConfig: INetworkConfig;
  let mockWalletClient: Partial<WalletClient>;
  let mockPublicClient: Partial<PublicClient>;

  beforeEach(() => {
    mockConfig = {
      network: 'test',
      chainId: 1,
      urls: {
        rpc: 'http://localhost:8545',
        explorer: 'http://localhost:3000',
      },
      subgraph: 'http://localhost:8000',
      contracts: {
        DAO: '0x0000000000000000000000000000000000000001' as `0x${string}`,
        VotingToken: '0x0000000000000000000000000000000000000002' as `0x${string}`,
        TaikoBridge: '0x0000000000000000000000000000000000000003' as `0x${string}`,
        MultisigPlugin: '0x0000000000000000000000000000000000000004' as `0x${string}`,
        EmergencyMultisigPlugin: '0x0000000000000000000000000000000000000005' as `0x${string}`,
        OptimisticTokenVotingPlugin: '0x0000000000000000000000000000000000000006' as `0x${string}`,
        SignerList: '0x0000000000000000000000000000000000000007' as `0x${string}`,
        EncryptionRegistry: '0x0000000000000000000000000000000000000008' as `0x${string}`,
        DelegationWall: '0x0000000000000000000000000000000000000009' as `0x${string}`,
      },
    };

    mockWalletClient = {
      account: {
        address: '0x1234567890123456789012345678901234567890' as `0x${string}`,
      } as any,
      writeContract: jest.fn().mockResolvedValue('0xhash'),
    } as Partial<WalletClient>;

    mockPublicClient = {
      readContract: jest.fn(),
      simulateContract: jest.fn(),
      waitForTransactionReceipt: jest.fn().mockResolvedValue({ status: 'success' }),
    } as Partial<PublicClient>;
  });

  describe('canVetoProposal', () => {
    it('should return true when user can veto', async () => {
      (mockPublicClient.readContract as jest.Mock).mockResolvedValue(true);

      const result = await canVetoProposal(
        mockConfig,
        mockPublicClient as PublicClient,
        1,
        '0x1234567890123456789012345678901234567890',
      );

      expect(result).toBe(true);
      expect(mockPublicClient.readContract).toHaveBeenCalledWith({
        address: mockConfig.contracts.OptimisticTokenVotingPlugin,
        abi: expect.any(Array),
        functionName: 'canVeto',
        args: [BigInt(1), '0x1234567890123456789012345678901234567890'],
      });
    });

    it('should return false when user cannot veto', async () => {
      (mockPublicClient.readContract as jest.Mock).mockResolvedValue(false);

      const result = await canVetoProposal(
        mockConfig,
        mockPublicClient as PublicClient,
        1,
        '0x1234567890123456789012345678901234567890',
      );

      expect(result).toBe(false);
    });

    it('should throw error on failure', async () => {
      const error = new Error('Contract call failed');
      (mockPublicClient.readContract as jest.Mock).mockRejectedValue(error);

      await expect(
        canVetoProposal(mockConfig, mockPublicClient as PublicClient, 1, '0x1234567890123456789012345678901234567890'),
      ).rejects.toThrow('Contract call failed');
    });
  });

  describe('hasVetoedProposal', () => {
    it('should return true when user has already vetoed', async () => {
      (mockPublicClient.readContract as jest.Mock).mockResolvedValue(true);

      const result = await hasVetoedProposal(
        mockConfig,
        mockPublicClient as PublicClient,
        1,
        '0x1234567890123456789012345678901234567890',
      );

      expect(result).toBe(true);
      expect(mockPublicClient.readContract).toHaveBeenCalledWith({
        address: mockConfig.contracts.OptimisticTokenVotingPlugin,
        abi: expect.any(Array),
        functionName: 'hasVetoed',
        args: [BigInt(1), '0x1234567890123456789012345678901234567890'],
      });
    });

    it('should return false when user has not vetoed', async () => {
      (mockPublicClient.readContract as jest.Mock).mockResolvedValue(false);

      const result = await hasVetoedProposal(
        mockConfig,
        mockPublicClient as PublicClient,
        1,
        '0x1234567890123456789012345678901234567890',
      );

      expect(result).toBe(false);
    });
  });

  describe('isMinVetoRatioReached', () => {
    it('should return true when minimum veto ratio is reached', async () => {
      (mockPublicClient.readContract as jest.Mock).mockResolvedValue(true);

      const result = await isMinVetoRatioReached(mockConfig, mockPublicClient as PublicClient, 1);

      expect(result).toBe(true);
      expect(mockPublicClient.readContract).toHaveBeenCalledWith({
        address: mockConfig.contracts.OptimisticTokenVotingPlugin,
        abi: expect.any(Array),
        functionName: 'isMinVetoRatioReached',
        args: [BigInt(1)],
      });
    });

    it('should return false when minimum veto ratio is not reached', async () => {
      (mockPublicClient.readContract as jest.Mock).mockResolvedValue(false);

      const result = await isMinVetoRatioReached(mockConfig, mockPublicClient as PublicClient, 1);

      expect(result).toBe(false);
    });
  });

  describe('getMinVetoRatio', () => {
    it('should return the minimum veto ratio', async () => {
      (mockPublicClient.readContract as jest.Mock).mockResolvedValue(BigInt(2500)); // 25%

      const result = await getMinVetoRatio(mockConfig, mockPublicClient as PublicClient);

      expect(result).toBe(2500);
      expect(mockPublicClient.readContract).toHaveBeenCalledWith({
        address: mockConfig.contracts.OptimisticTokenVotingPlugin,
        abi: expect.any(Array),
        functionName: 'minVetoRatio',
        args: [],
      });
    });
  });

  describe('vetoProposal', () => {
    it('should successfully veto a proposal', async () => {
      // Mock the sequence of contract calls
      (mockPublicClient.readContract as jest.Mock)
        .mockResolvedValueOnce(true) // canVeto
        .mockResolvedValueOnce(false) // hasVetoed
        .mockResolvedValueOnce(false); // isMinVetoRatioReached

      (mockPublicClient.simulateContract as jest.Mock).mockResolvedValue({
        request: { args: [BigInt(1)] },
      });

      const result = await vetoProposal(
        mockConfig,
        mockWalletClient as WalletClient,
        mockPublicClient as PublicClient,
        1,
      );

      expect(result).toBe('0xhash');
      expect(mockWalletClient.writeContract).toHaveBeenCalled();
      expect(mockPublicClient.waitForTransactionReceipt).toHaveBeenCalledWith({ hash: '0xhash' });
    });

    it('should show warning when veto threshold is reached', async () => {
      const consoleSpy = jest.spyOn(console, 'info');

      (mockPublicClient.readContract as jest.Mock)
        .mockResolvedValueOnce(true) // canVeto
        .mockResolvedValueOnce(false) // hasVetoed
        .mockResolvedValueOnce(true); // isMinVetoRatioReached - threshold reached!

      (mockPublicClient.simulateContract as jest.Mock).mockResolvedValue({
        request: { args: [BigInt(1)] },
      });

      await vetoProposal(mockConfig, mockWalletClient as WalletClient, mockPublicClient as PublicClient, 1);

      expect(consoleSpy).toHaveBeenCalledWith(
        '⚠️  The minimum veto ratio has been reached - this proposal will not execute',
      );
    });

    it('should throw error when user cannot veto', async () => {
      (mockPublicClient.readContract as jest.Mock).mockResolvedValueOnce(false); // canVeto = false

      await expect(
        vetoProposal(mockConfig, mockWalletClient as WalletClient, mockPublicClient as PublicClient, 1),
      ).rejects.toThrow('You cannot veto this proposal');
    });

    it('should throw error when user has already vetoed', async () => {
      (mockPublicClient.readContract as jest.Mock)
        .mockResolvedValueOnce(true) // canVeto
        .mockResolvedValueOnce(true); // hasVetoed = true

      await expect(
        vetoProposal(mockConfig, mockWalletClient as WalletClient, mockPublicClient as PublicClient, 1),
      ).rejects.toThrow('You have already vetoed this proposal');
    });

    it('should throw error when transaction fails', async () => {
      (mockPublicClient.readContract as jest.Mock)
        .mockResolvedValueOnce(true) // canVeto
        .mockResolvedValueOnce(false); // hasVetoed

      (mockPublicClient.simulateContract as jest.Mock).mockResolvedValue({
        request: { args: [BigInt(1)] },
      });

      (mockPublicClient.waitForTransactionReceipt as jest.Mock).mockResolvedValue({
        status: 'reverted',
      });

      await expect(
        vetoProposal(mockConfig, mockWalletClient as WalletClient, mockPublicClient as PublicClient, 1),
      ).rejects.toThrow('Transaction failed');
    });
  });
});
