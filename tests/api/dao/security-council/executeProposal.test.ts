import {
  executeStandardProposal,
  executeEmergencyProposal,
} from '../../../../src/api/dao/security-council/executeProposal';
import { INetworkConfig } from '../../../../src/types/network.type';
import { WalletClient, PublicClient } from 'viem';
import * as getDecryptionKey from '../../../../src/api/dao/security-council/getDecryptionKey';
import * as getIpfsFile from '../../../../src/api/ipfs/getIpfsFile';
import * as pinToIpfs from '../../../../src/api/ipfs/pinToIpfs';
import getEmergencyProposal from '../../../../src/api/dao/emergency-proposal/getEmergencyProposal';

jest.mock('../../../../src/api/dao/security-council/getDecryptionKey');
jest.mock('../../../../src/api/ipfs/getIpfsFile');
jest.mock('../../../../src/api/ipfs/pinToIpfs');
jest.mock('../../../../src/api/dao/emergency-proposal/getEmergencyProposal');

describe('executeProposal', () => {
  let mockConfig: INetworkConfig;
  let mockWalletClient: Partial<WalletClient>;
  let mockPublicClient: Partial<PublicClient>;
  let consoleInfoSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    mockConfig = {
      network: 'holesky',
      chainId: 17000,
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
      account: undefined,
      writeContract: jest.fn(),
    };

    mockPublicClient = {
      readContract: jest.fn(),
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

  describe('executeStandardProposal', () => {
    it('should successfully execute a standard proposal', async () => {
      const proposalId = 1;
      const txHash = '0xtxhash123';

      (mockPublicClient.readContract as jest.Mock).mockResolvedValue(true); // canExecute

      (mockPublicClient.simulateContract as jest.Mock).mockResolvedValue({
        request: { data: 'mockRequest' },
      });

      (mockWalletClient.writeContract as jest.Mock).mockResolvedValue(txHash);

      (mockPublicClient.waitForTransactionReceipt as jest.Mock).mockResolvedValue({
        status: 'success',
      });

      const result = await executeStandardProposal(
        mockConfig,
        mockWalletClient as WalletClient,
        mockPublicClient as PublicClient,
        proposalId,
      );

      expect(result).toBe(txHash);
      expect(consoleInfoSpy).toHaveBeenCalledWith(`Executing standard proposal ${proposalId}...`);
      expect(consoleInfoSpy).toHaveBeenCalledWith(`Successfully executed standard proposal ${proposalId}`);
      expect(mockPublicClient.readContract).toHaveBeenCalledWith({
        address: mockConfig.contracts.MultisigPlugin,
        abi: expect.any(Array) as unknown[],
        functionName: 'canExecute',
        args: [proposalId],
      });
    });

    it('should throw error when proposal cannot be executed', async () => {
      const proposalId = 2;

      (mockPublicClient.readContract as jest.Mock).mockResolvedValue(false); // canExecute = false

      await expect(
        executeStandardProposal(
          mockConfig,
          mockWalletClient as WalletClient,
          mockPublicClient as PublicClient,
          proposalId,
        ),
      ).rejects.toThrow('Proposal cannot be executed yet (insufficient approvals or expired)');

      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to execute standard proposal:', expect.any(Error) as Error);
    });

    it('should handle transaction failure', async () => {
      const proposalId = 3;

      (mockPublicClient.readContract as jest.Mock).mockResolvedValue(true);
      (mockPublicClient.simulateContract as jest.Mock).mockResolvedValue({
        request: { data: 'mockRequest' },
      });
      (mockWalletClient.writeContract as jest.Mock).mockResolvedValue('0xtxhash456');
      (mockPublicClient.waitForTransactionReceipt as jest.Mock).mockResolvedValue({
        status: 'reverted',
      });

      await expect(
        executeStandardProposal(
          mockConfig,
          mockWalletClient as WalletClient,
          mockPublicClient as PublicClient,
          proposalId,
        ),
      ).rejects.toThrow('Transaction failed');

      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to execute standard proposal:', expect.any(Error) as Error);
    });

    it('should handle simulation errors', async () => {
      const proposalId = 4;
      const error = new Error('Simulation failed');

      (mockPublicClient.readContract as jest.Mock).mockResolvedValue(true);
      (mockPublicClient.simulateContract as jest.Mock).mockRejectedValue(error);

      await expect(
        executeStandardProposal(
          mockConfig,
          mockWalletClient as WalletClient,
          mockPublicClient as PublicClient,
          proposalId,
        ),
      ).rejects.toThrow('Simulation failed');

      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to execute standard proposal:', error);
    });
  });

  describe('executeEmergencyProposal', () => {
    it('should successfully execute an emergency proposal with decryption', async () => {
      const proposalId = 5;
      const txHash = '0xtxhash789';
      const mockProposal = {
        proposalId: 5,
        encryptedPayloadURI: 'ipfs://QmEncrypted',
        publicMetadataUriHash: '0xhash',
        destinationActionsHash: '0xactionshash',
      };
      const mockEncryptedData = {
        encrypted: {
          metadata: 'encrypted',
          actions: 'encrypted',
          symmetricKeys: ['0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'],
        },
      };
      const mockDecryptedData = {
        metadata: { title: 'Decrypted Proposal', description: 'Test' },
        actions: [
          {
            to: '0x1234567890abcdef1234567890abcdef12345678',
            value: 0n,
            data: '0xdata',
          },
        ],
        rawMetadata: new Uint8Array([1, 2, 3]),
        rawActions: new Uint8Array([4, 5, 6]),
      };
      const mockIpfsHash = 'QmPublic123';

      (getEmergencyProposal as jest.Mock).mockResolvedValue(mockProposal);
      (getIpfsFile.getIpfsFileSafe as jest.Mock).mockResolvedValue(mockEncryptedData);
      (getDecryptionKey.decryptProposalForExecution as jest.Mock).mockResolvedValue(mockDecryptedData);
      (pinToIpfs.pinJsonToIpfs as jest.Mock).mockResolvedValue(mockIpfsHash);

      (mockPublicClient.readContract as jest.Mock).mockResolvedValue(true); // canExecute

      (mockPublicClient.simulateContract as jest.Mock).mockResolvedValue({
        request: { data: 'mockRequest' },
      });

      (mockWalletClient.writeContract as jest.Mock).mockResolvedValue(txHash);

      (mockPublicClient.waitForTransactionReceipt as jest.Mock).mockResolvedValue({
        status: 'success',
      });

      const result = await executeEmergencyProposal(
        mockConfig,
        mockWalletClient as WalletClient,
        mockPublicClient as PublicClient,
        proposalId,
      );

      expect(result).toBe(txHash);
      expect(consoleInfoSpy).toHaveBeenCalledWith(`Executing emergency proposal ${proposalId}...`);
      expect(consoleInfoSpy).toHaveBeenCalledWith(`Successfully executed emergency proposal ${proposalId}`);
      expect(getEmergencyProposal).toHaveBeenCalledWith(proposalId, mockConfig);
      expect(getIpfsFile.getIpfsFileSafe).toHaveBeenCalledWith('QmEncrypted');
      expect(getDecryptionKey.decryptProposalForExecution).toHaveBeenCalledWith(mockConfig, mockEncryptedData);
      expect(pinToIpfs.pinJsonToIpfs).toHaveBeenCalledWith(mockDecryptedData.metadata);
    });

    it('should throw error when emergency proposal cannot be executed', async () => {
      const proposalId = 6;

      (mockPublicClient.readContract as jest.Mock).mockResolvedValue(false); // canExecute = false

      await expect(
        executeEmergencyProposal(
          mockConfig,
          mockWalletClient as WalletClient,
          mockPublicClient as PublicClient,
          proposalId,
        ),
      ).rejects.toThrow('Proposal cannot be executed yet (insufficient approvals or expired)');

      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to execute emergency proposal:', expect.any(Error) as Error);
    });

    it('should handle missing encrypted payload URI', async () => {
      const proposalId = 7;
      const mockProposal = {
        proposalId: 7,
        encryptedPayloadURI: null,
      };

      (mockPublicClient.readContract as jest.Mock).mockResolvedValue(true); // canExecute = true
      (getEmergencyProposal as jest.Mock).mockResolvedValue(mockProposal);

      await expect(
        executeEmergencyProposal(
          mockConfig,
          mockWalletClient as WalletClient,
          mockPublicClient as PublicClient,
          proposalId,
        ),
      ).rejects.toThrow('Could not fetch emergency proposal data');

      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to execute emergency proposal:', expect.any(Error) as Error);
    });

    it('should handle IPFS fetch errors', async () => {
      const proposalId = 8;
      const mockProposal = {
        proposalId: 8,
        encryptedPayloadURI: 'ipfs://QmEncrypted',
      };

      (mockPublicClient.readContract as jest.Mock).mockResolvedValue(true); // canExecute = true
      (getEmergencyProposal as jest.Mock).mockResolvedValue(mockProposal);
      (getIpfsFile.getIpfsFileSafe as jest.Mock).mockResolvedValue(null); // Failed to fetch

      await expect(
        executeEmergencyProposal(
          mockConfig,
          mockWalletClient as WalletClient,
          mockPublicClient as PublicClient,
          proposalId,
        ),
      ).rejects.toThrow('Could not fetch encrypted payload from IPFS');

      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to execute emergency proposal:', expect.any(Error) as Error);
    });

    it('should handle decryption errors', async () => {
      const proposalId = 9;
      const mockProposal = {
        proposalId: 9,
        encryptedPayloadURI: 'ipfs://QmEncrypted',
      };
      const mockEncryptedData = {
        encrypted: {
          metadata: 'encrypted',
          actions: 'encrypted',
          symmetricKeys: ['0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'],
        },
      };

      (mockPublicClient.readContract as jest.Mock).mockResolvedValue(true); // canExecute = true
      (getEmergencyProposal as jest.Mock).mockResolvedValue(mockProposal);
      (getIpfsFile.getIpfsFileSafe as jest.Mock).mockResolvedValue(mockEncryptedData);
      (getDecryptionKey.decryptProposalForExecution as jest.Mock).mockRejectedValue(new Error('Decryption failed'));

      await expect(
        executeEmergencyProposal(
          mockConfig,
          mockWalletClient as WalletClient,
          mockPublicClient as PublicClient,
          proposalId,
        ),
      ).rejects.toThrow('Decryption failed');

      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to execute emergency proposal:', expect.any(Error) as Error);
    });

    it('should handle emergency transaction failure', async () => {
      const proposalId = 10;
      const mockProposal = {
        proposalId: 10,
        encryptedPayloadURI: 'ipfs://QmEncrypted',
      };
      const mockEncryptedData = {
        encrypted: {
          metadata: 'encrypted',
          actions: 'encrypted',
          symmetricKeys: ['0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'],
        },
      };
      const mockDecryptedData = {
        metadata: { title: 'Test' },
        actions: [],
        rawMetadata: new Uint8Array([1]),
        rawActions: new Uint8Array([2]),
      };

      (mockPublicClient.readContract as jest.Mock).mockResolvedValue(true);
      (getEmergencyProposal as jest.Mock).mockResolvedValue(mockProposal);
      (getIpfsFile.getIpfsFileSafe as jest.Mock).mockResolvedValue(mockEncryptedData);
      (getDecryptionKey.decryptProposalForExecution as jest.Mock).mockResolvedValue(mockDecryptedData);
      (pinToIpfs.pinJsonToIpfs as jest.Mock).mockResolvedValue('QmPublic');
      (mockPublicClient.simulateContract as jest.Mock).mockResolvedValue({
        request: { data: 'mockRequest' },
      });
      (mockWalletClient.writeContract as jest.Mock).mockResolvedValue('0xtxhash');
      (mockPublicClient.waitForTransactionReceipt as jest.Mock).mockResolvedValue({
        status: 'reverted',
      });

      await expect(
        executeEmergencyProposal(
          mockConfig,
          mockWalletClient as WalletClient,
          mockPublicClient as PublicClient,
          proposalId,
        ),
      ).rejects.toThrow('Transaction failed');

      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to execute emergency proposal:', expect.any(Error) as Error);
    });

    it('should handle null decrypted data', async () => {
      const proposalId = 11;
      const mockProposal = {
        proposalId: 11,
        encryptedPayloadURI: 'ipfs://QmEncrypted',
      };
      const mockEncryptedData = {
        encrypted: {
          metadata: 'encrypted',
          actions: 'encrypted',
          symmetricKeys: ['0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'],
        },
      };

      (mockPublicClient.readContract as jest.Mock).mockResolvedValue(true);
      (getEmergencyProposal as jest.Mock).mockResolvedValue(mockProposal);
      (getIpfsFile.getIpfsFileSafe as jest.Mock).mockResolvedValue(mockEncryptedData);
      (getDecryptionKey.decryptProposalForExecution as jest.Mock).mockResolvedValue(null);

      await expect(
        executeEmergencyProposal(
          mockConfig,
          mockWalletClient as WalletClient,
          mockPublicClient as PublicClient,
          proposalId,
        ),
      ).rejects.toThrow('Could not decrypt emergency proposal');

      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to execute emergency proposal:', expect.any(Error) as Error);
    });
  });
});
