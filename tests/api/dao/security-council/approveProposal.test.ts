import { approveStandardProposal, approveEmergencyProposal } from '../../../../src/api/dao/security-council/approveProposal';
import { INetworkConfig } from '../../../../src/types/network.type';
import { WalletClient, PublicClient } from 'viem';

describe('approveProposal', () => {
  let mockConfig: INetworkConfig;
  let mockWalletClient: Partial<WalletClient>;
  let mockPublicClient: Partial<PublicClient>;
  let consoleInfoSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    mockConfig = {
      network: 'holesky',
      urls: {
        rpc: 'https://rpc.holesky.ethpandaops.io',
        explorer: 'https://holesky.etherscan.io',
      },
      subgraph: 'https://subgraph.holesky.example.com',
      contracts: {
        DAO: '0x1234567890abcdef1234567890abcdef12345678' as `0x${string}`,
        VotingToken: '0x2345678901abcdef2345678901abcdef23456789' as `0x${string}`,
        TaikoBridge: '0x3456789012abcdef3456789012abcdef34567890' as `0x${string}`,
        MultisigPlugin: '0x4567890123abcdef4567890123abcdef45678901' as `0x${string}`,
        EmergencyMultisigPlugin: '0x5678901234abcdef5678901234abcdef56789012' as `0x${string}`,
        OptimisticTokenVotingPlugin: '0x6789012345abcdef6789012345abcdef67890123' as `0x${string}`,
        SignerList: '0x7890123456abcdef7890123456abcdef78901234' as `0x${string}`,
        EncryptionRegistry: '0x8901234567abcdef8901234567abcdef89012345' as `0x${string}`,
        DelegationWall: '0x9012345678abcdef9012345678abcdef90123456' as `0x${string}`,
      },
    };

    mockWalletClient = {
      account: {
        address: '0xuser1234567890abcdef1234567890abcdef1234' as `0x${string}`,
      } as any,
      writeContract: jest.fn(),
    };

    mockPublicClient = {
      simulateContract: jest.fn(),
      waitForTransactionReceipt: jest.fn(),
    };

    consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
    consoleInfoSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('approveStandardProposal', () => {
    it('should successfully approve a standard proposal', async () => {
      const proposalId = 1;
      const txHash = '0xtxhash123';
      
      (mockPublicClient.simulateContract as jest.Mock).mockResolvedValue({
        request: { data: 'mockRequest' },
      });
      
      (mockWalletClient.writeContract as jest.Mock).mockResolvedValue(txHash);
      
      (mockPublicClient.waitForTransactionReceipt as jest.Mock).mockResolvedValue({
        status: 'success',
      });

      const result = await approveStandardProposal(
        mockConfig,
        mockWalletClient as WalletClient,
        mockPublicClient as PublicClient,
        proposalId,
      );

      expect(result).toBe(txHash);
      expect(consoleInfoSpy).toHaveBeenCalledWith(`Approving standard proposal ${proposalId}...`);
      expect(consoleInfoSpy).toHaveBeenCalledWith(`Successfully approved standard proposal ${proposalId}`);
      expect(mockPublicClient.simulateContract).toHaveBeenCalledWith({
        address: mockConfig.contracts.MultisigPlugin,
        abi: expect.any(Array),
        functionName: 'approve',
        args: [proposalId, false],
        account: mockWalletClient.account,
      });
    });

    it('should throw error when transaction fails', async () => {
      const proposalId = 2;
      
      (mockPublicClient.simulateContract as jest.Mock).mockResolvedValue({
        request: { data: 'mockRequest' },
      });
      
      (mockWalletClient.writeContract as jest.Mock).mockResolvedValue('0xtxhash456');
      
      (mockPublicClient.waitForTransactionReceipt as jest.Mock).mockResolvedValue({
        status: 'reverted',
      });

      await expect(
        approveStandardProposal(
          mockConfig,
          mockWalletClient as WalletClient,
          mockPublicClient as PublicClient,
          proposalId,
        ),
      ).rejects.toThrow('Transaction failed');

      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to approve standard proposal:', expect.any(Error));
    });

    it('should handle simulation errors', async () => {
      const proposalId = 3;
      const error = new Error('Simulation failed');
      
      (mockPublicClient.simulateContract as jest.Mock).mockRejectedValue(error);

      await expect(
        approveStandardProposal(
          mockConfig,
          mockWalletClient as WalletClient,
          mockPublicClient as PublicClient,
          proposalId,
        ),
      ).rejects.toThrow('Simulation failed');

      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to approve standard proposal:', error);
    });

    it('should handle write contract errors', async () => {
      const proposalId = 4;
      const error = new Error('Write failed');
      
      (mockPublicClient.simulateContract as jest.Mock).mockResolvedValue({
        request: { data: 'mockRequest' },
      });
      
      (mockWalletClient.writeContract as jest.Mock).mockRejectedValue(error);

      await expect(
        approveStandardProposal(
          mockConfig,
          mockWalletClient as WalletClient,
          mockPublicClient as PublicClient,
          proposalId,
        ),
      ).rejects.toThrow('Write failed');

      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to approve standard proposal:', error);
    });
  });

  describe('approveEmergencyProposal', () => {
    it('should successfully approve an emergency proposal', async () => {
      const proposalId = 5;
      const txHash = '0xtxhash789';
      
      (mockPublicClient.simulateContract as jest.Mock).mockResolvedValue({
        request: { data: 'mockRequest' },
      });
      
      (mockWalletClient.writeContract as jest.Mock).mockResolvedValue(txHash);
      
      (mockPublicClient.waitForTransactionReceipt as jest.Mock).mockResolvedValue({
        status: 'success',
      });

      const result = await approveEmergencyProposal(
        mockConfig,
        mockWalletClient as WalletClient,
        mockPublicClient as PublicClient,
        proposalId,
      );

      expect(result).toBe(txHash);
      expect(consoleInfoSpy).toHaveBeenCalledWith(`Approving emergency proposal ${proposalId}...`);
      expect(consoleInfoSpy).toHaveBeenCalledWith(`Successfully approved emergency proposal ${proposalId}`);
      expect(mockPublicClient.simulateContract).toHaveBeenCalledWith({
        address: mockConfig.contracts.EmergencyMultisigPlugin,
        abi: expect.any(Array),
        functionName: 'approve',
        args: [proposalId],
        account: mockWalletClient.account,
      });
    });

    it('should throw error when emergency transaction fails', async () => {
      const proposalId = 6;
      
      (mockPublicClient.simulateContract as jest.Mock).mockResolvedValue({
        request: { data: 'mockRequest' },
      });
      
      (mockWalletClient.writeContract as jest.Mock).mockResolvedValue('0xtxhash101');
      
      (mockPublicClient.waitForTransactionReceipt as jest.Mock).mockResolvedValue({
        status: 'reverted',
      });

      await expect(
        approveEmergencyProposal(
          mockConfig,
          mockWalletClient as WalletClient,
          mockPublicClient as PublicClient,
          proposalId,
        ),
      ).rejects.toThrow('Transaction failed');

      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to approve emergency proposal:', expect.any(Error));
    });

    it('should handle emergency simulation errors', async () => {
      const proposalId = 7;
      const error = new Error('Emergency simulation failed');
      
      (mockPublicClient.simulateContract as jest.Mock).mockRejectedValue(error);

      await expect(
        approveEmergencyProposal(
          mockConfig,
          mockWalletClient as WalletClient,
          mockPublicClient as PublicClient,
          proposalId,
        ),
      ).rejects.toThrow('Emergency simulation failed');

      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to approve emergency proposal:', error);
    });

    it('should handle emergency write contract errors', async () => {
      const proposalId = 8;
      const error = new Error('Emergency write failed');
      
      (mockPublicClient.simulateContract as jest.Mock).mockResolvedValue({
        request: { data: 'mockRequest' },
      });
      
      (mockWalletClient.writeContract as jest.Mock).mockRejectedValue(error);

      await expect(
        approveEmergencyProposal(
          mockConfig,
          mockWalletClient as WalletClient,
          mockPublicClient as PublicClient,
          proposalId,
        ),
      ).rejects.toThrow('Emergency write failed');

      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to approve emergency proposal:', error);
    });
  });
});