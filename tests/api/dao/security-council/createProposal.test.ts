import { createProposal, encodeAction, ProposalAction } from '../../../../src/api/dao/security-council/createProposal';
import { INetworkConfig } from '../../../../src/types/network.type';
import { WalletClient, PublicClient } from 'viem';
import * as encryptProposal from '../../../../src/api/dao/security-council/encryptProposal';
import * as pinToIpfs from '../../../../src/api/ipfs/pinToIpfs';
import { ABIs } from '../../../../src/abi';

jest.mock('../../../../src/api/dao/security-council/encryptProposal');
jest.mock('../../../../src/api/ipfs/pinToIpfs');

describe('createProposal', () => {
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

  describe('createProposal - standard', () => {
    it('should successfully create a standard proposal', async () => {
      const metadata = {
        title: 'Test Proposal',
        summary: 'Test summary',
        description: 'Test description',
      };
      const actions: ProposalAction[] = [
        {
          to: '0x1234567890abcdef1234567890abcdef12345678' as `0x${string}`,
          value: 0n,
          data: '0xdata' as `0x${string}`,
        },
      ];
      const mockIpfsHash = 'QmTestHash123';
      const txHash = '0xtxhash123';
      const proposalId = 1n;

      (pinToIpfs.pinJsonToIpfs as jest.Mock).mockResolvedValue(mockIpfsHash);
      (mockPublicClient.simulateContract as jest.Mock).mockResolvedValue({
        request: { data: 'mockRequest' },
      });
      (mockWalletClient.writeContract as jest.Mock).mockResolvedValue(txHash);
      (mockPublicClient.waitForTransactionReceipt as jest.Mock).mockResolvedValue({
        status: 'success',
        logs: [
          {
            data: '0x',
            topics: ['0xevent', `0x${proposalId.toString(16).padStart(64, '0')}`],
          },
        ],
      });

      const result = await createProposal(
        mockConfig,
        mockWalletClient as WalletClient,
        mockPublicClient as PublicClient,
        metadata,
        actions,
        null,
        true,
        'standard',
      );

      expect(result).toBe(txHash);
      expect(consoleInfoSpy).toHaveBeenCalledWith('📤 Uploading proposal metadata to IPFS...');
      expect(consoleInfoSpy).toHaveBeenCalledWith(`✅ Metadata uploaded to IPFS: ipfs://${mockIpfsHash}`);
      expect(consoleInfoSpy).toHaveBeenCalledWith('✅ Proposal created successfully!');
      expect(consoleInfoSpy).toHaveBeenCalledWith(`Transaction hash: ${txHash}`);
    });

    it('should handle IPFS upload failure', async () => {
      const metadata = { title: 'Test', summary: 'Sum', description: 'Desc' };
      const actions: ProposalAction[] = [];
      const error = new Error('IPFS upload failed');

      (pinToIpfs.pinJsonToIpfs as jest.Mock).mockRejectedValue(error);

      await expect(
        createProposal(
          mockConfig,
          mockWalletClient as WalletClient,
          mockPublicClient as PublicClient,
          metadata,
          actions,
          null,
          true,
          'standard',
        ),
      ).rejects.toThrow('IPFS upload failed');

      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to create proposal:', error);
    });

    it('should handle transaction failure', async () => {
      const metadata = { title: 'Test', summary: 'Sum', description: 'Desc' };
      const actions: ProposalAction[] = [];
      const mockIpfsHash = 'QmTestHash';
      const txHash = '0xtxhash';

      (pinToIpfs.pinJsonToIpfs as jest.Mock).mockResolvedValue(mockIpfsHash);
      (mockPublicClient.simulateContract as jest.Mock).mockResolvedValue({
        request: { data: 'mockRequest' },
      });
      (mockWalletClient.writeContract as jest.Mock).mockResolvedValue(txHash);
      (mockPublicClient.waitForTransactionReceipt as jest.Mock).mockResolvedValue({
        status: 'reverted',
      });

      await expect(
        createProposal(
          mockConfig,
          mockWalletClient as WalletClient,
          mockPublicClient as PublicClient,
          metadata,
          actions,
        ),
      ).rejects.toThrow('Transaction failed');

      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to create proposal:', expect.any(Error));
    });

    it('should handle simulation errors', async () => {
      const metadata = { title: 'Test', summary: 'Sum', description: 'Desc' };
      const actions: ProposalAction[] = [];
      const mockIpfsHash = 'QmTestHash';
      const error = new Error('Simulation failed');

      (pinToIpfs.pinJsonToIpfs as jest.Mock).mockResolvedValue(mockIpfsHash);
      (mockPublicClient.simulateContract as jest.Mock).mockRejectedValue(error);

      await expect(
        createProposal(
          mockConfig,
          mockWalletClient as WalletClient,
          mockPublicClient as PublicClient,
          metadata,
          actions,
        ),
      ).rejects.toThrow('Simulation failed');

      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to create proposal:', error);
    });
  });

  describe('createProposal - emergency', () => {
    it('should successfully create an emergency proposal', async () => {
      const metadata = {
        title: 'Emergency Proposal',
        summary: 'Urgent',
        description: 'Urgent action needed',
      };
      const actions: ProposalAction[] = [
        {
          to: '0x1234567890abcdef1234567890abcdef12345678' as `0x${string}`,
          value: 0n,
          data: '0xdata' as `0x${string}`,
        },
      ];
      const mockEncryptedData = {
        encryptedPayloadURI: 'ipfs://QmEncrypted',
        publicMetadataUriHash: '0xhash1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab' as `0x${string}`,
        destinationActionsHash: '0xactionshash1234567890abcdef1234567890abcdef1234567890abcdef1234' as `0x${string}`,
      };
      const txHash = '0xtxhash789';
      const proposalId = 5n;

      (encryptProposal.encryptEmergencyProposal as jest.Mock).mockResolvedValue(mockEncryptedData);
      (mockPublicClient.simulateContract as jest.Mock).mockResolvedValue({
        request: { data: 'mockRequest' },
      });
      (mockWalletClient.writeContract as jest.Mock).mockResolvedValue(txHash);
      (mockPublicClient.waitForTransactionReceipt as jest.Mock).mockResolvedValue({
        status: 'success',
        logs: [
          {
            data: '0x',
            topics: ['0xevent', `0x${proposalId.toString(16).padStart(64, '0')}`],
          },
        ],
      });

      const result = await createProposal(
        mockConfig,
        mockWalletClient as WalletClient,
        mockPublicClient as PublicClient,
        metadata,
        actions,
        null,
        true,
        'emergency',
      );

      expect(result).toBe(txHash);
      expect(consoleInfoSpy).toHaveBeenCalledWith('✅ Proposal created successfully!');
      expect(consoleInfoSpy).toHaveBeenCalledWith(`Transaction hash: ${txHash}`);
    });

    it('should handle encryption failure', async () => {
      const metadata = { title: 'Emergency', summary: 'Sum', description: 'Desc' };
      const actions: ProposalAction[] = [];
      const error = new Error('Encryption failed');

      (encryptProposal.encryptEmergencyProposal as jest.Mock).mockRejectedValue(error);

      await expect(
        createProposal(
          mockConfig,
          mockWalletClient as WalletClient,
          mockPublicClient as PublicClient,
          metadata,
          actions,
          null,
          true,
          'emergency',
        ),
      ).rejects.toThrow('Encryption failed');

      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to create proposal:', error);
    });

    it('should handle transaction failure for emergency', async () => {
      const metadata = { title: 'Emergency', summary: 'Sum', description: 'Desc' };
      const actions: ProposalAction[] = [];
      const mockEncryptedData = {
        encryptedPayloadURI: 'ipfs://QmEncrypted',
        publicMetadataUriHash: '0xhash1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab' as `0x${string}`,
        destinationActionsHash: '0xactionshash1234567890abcdef1234567890abcdef1234567890abcdef1234' as `0x${string}`,
      };
      const txHash = '0xtxhash';

      (encryptProposal.encryptEmergencyProposal as jest.Mock).mockResolvedValue(mockEncryptedData);
      (mockPublicClient.simulateContract as jest.Mock).mockResolvedValue({
        request: { data: 'mockRequest' },
      });
      (mockWalletClient.writeContract as jest.Mock).mockResolvedValue(txHash);
      (mockPublicClient.waitForTransactionReceipt as jest.Mock).mockResolvedValue({
        status: 'reverted',
      });

      await expect(
        createProposal(
          mockConfig,
          mockWalletClient as WalletClient,
          mockPublicClient as PublicClient,
          metadata,
          actions,
          null,
          true,
          'emergency',
        ),
      ).rejects.toThrow('Transaction failed');

      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to create proposal:', expect.any(Error));
    });
  });

  describe('encodeAction', () => {
    it('should encode a contract call as an action', () => {
      const contractAddress = '0x1234567890abcdef1234567890abcdef12345678' as `0x${string}`;
      const abi = [
        {
          name: 'transfer',
          type: 'function',
          inputs: [
            { name: 'to', type: 'address' },
            { name: 'amount', type: 'uint256' },
          ],
        },
      ];
      const functionName = 'transfer';
      const args = ['0x2345678901abcdef2345678901abcdef23456789', 1000n];
      const value = 0n;

      const result = encodeAction(contractAddress, abi, functionName, args, value);

      expect(result).toEqual({
        to: contractAddress,
        value: value,
        data: expect.stringMatching(/^0x[a-fA-F0-9]+$/),
      });
    });

    it('should encode action with value', () => {
      const contractAddress = '0x1234567890abcdef1234567890abcdef12345678' as `0x${string}`;
      const abi: any[] = [
        {
          name: 'transfer',
          type: 'function',
          inputs: [
            { name: 'to', type: 'address' },
            { name: 'amount', type: 'uint256' }
          ],
          outputs: []
        }
      ];
      const functionName = 'transfer';
      const args = ['0xabcdef1234567890abcdef1234567890abcdef12', 100n];
      const value = 1000n;

      const result = encodeAction(contractAddress, abi, functionName, args, value);

      expect(result).toEqual({
        to: contractAddress,
        value: value,
        data: expect.any(String),
      });
    });
  });
});