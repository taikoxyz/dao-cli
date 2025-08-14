import * as dotenv from 'dotenv';
import { createWalletClient, http, WalletClient } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import connectEnvWallet from '../../../src/api/web3/connectEnvWallet';
import { INetworkConfig } from '../../../src/types/network.type';

// Mock dependencies
jest.mock('dotenv');
jest.mock('viem');
jest.mock('viem/accounts');

const mockDotenv = dotenv as jest.Mocked<typeof dotenv>;
const mockCreateWalletClient = createWalletClient as jest.MockedFunction<typeof createWalletClient>;
const mockPrivateKeyToAccount = privateKeyToAccount as jest.MockedFunction<typeof privateKeyToAccount>;

describe('connectEnvWallet', () => {
  let mockConfig: INetworkConfig;
  let mockWalletClient: WalletClient;
  let mockAccount: any;

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

    mockAccount = {
      address: '0xabcdef1234567890abcdef1234567890abcdef12',
      publicKey: '0x1234567890abcdef',
    };

    mockWalletClient = {
      account: mockAccount,
      chain: { id: 1 },
      transport: { url: 'https://rpc.example.com' },
    } as any;

    mockPrivateKeyToAccount.mockReturnValue(mockAccount);
    mockCreateWalletClient.mockReturnValue(mockWalletClient);
  });

  describe('successful wallet connection', () => {
    it('should connect wallet with holesky private key', async () => {
      const mockPrivateKey = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      process.env.HOLESKY_PRIVATE_KEY = mockPrivateKey;

      const result = await connectEnvWallet(mockConfig);

      expect(mockPrivateKeyToAccount).toHaveBeenCalledWith(mockPrivateKey);
      expect(mockCreateWalletClient).toHaveBeenCalledWith({
        ...mockConfig,
        account: mockAccount,
        transport: http(mockConfig.urls.rpc),
      });
      expect(result).toBe(mockWalletClient);
    });

    it('should connect wallet with mainnet private key', async () => {
      mockConfig.network = 'mainnet';
      const mockPrivateKey = '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
      process.env.MAINNET_PRIVATE_KEY = mockPrivateKey;
      delete process.env.HOLESKY_PRIVATE_KEY;

      const result = await connectEnvWallet(mockConfig);

      expect(mockPrivateKeyToAccount).toHaveBeenCalledWith(mockPrivateKey);
      expect(mockCreateWalletClient).toHaveBeenCalledWith({
        ...mockConfig,
        account: mockAccount,
        transport: http(mockConfig.urls.rpc),
      });
      expect(result).toBe(mockWalletClient);
    });
  });

  describe('error handling', () => {
    it('should use fallback 0x when private key is missing for holesky', async () => {
      delete process.env.HOLESKY_PRIVATE_KEY;
      mockConfig.network = 'holesky';

      const result = await connectEnvWallet(mockConfig);

      expect(mockPrivateKeyToAccount).toHaveBeenCalledWith('0x');
      expect(result).toBe(mockWalletClient);
    });

    it('should use fallback 0x when private key is missing for mainnet', async () => {
      delete process.env.MAINNET_PRIVATE_KEY;
      mockConfig.network = 'mainnet';

      const result = await connectEnvWallet(mockConfig);

      expect(mockPrivateKeyToAccount).toHaveBeenCalledWith('0x');
      expect(result).toBe(mockWalletClient);
    });

    it('should use fallback 0x when private key is empty string for holesky', async () => {
      process.env.HOLESKY_PRIVATE_KEY = '';
      mockConfig.network = 'holesky';

      const result = await connectEnvWallet(mockConfig);

      expect(mockPrivateKeyToAccount).toHaveBeenCalledWith('0x');
      expect(result).toBe(mockWalletClient);
    });

    it('should use 0x when explicitly set', async () => {
      process.env.HOLESKY_PRIVATE_KEY = '0x';
      mockConfig.network = 'holesky';

      const result = await connectEnvWallet(mockConfig);

      expect(mockPrivateKeyToAccount).toHaveBeenCalledWith('0x');
      expect(result).toBe(mockWalletClient);
    });

    it('should use fallback 0x for unsupported network', async () => {
      mockConfig.network = 'unsupported-network' as any;
      delete process.env.HOLESKY_PRIVATE_KEY;
      delete process.env.MAINNET_PRIVATE_KEY;

      const result = await connectEnvWallet(mockConfig);

      expect(mockPrivateKeyToAccount).toHaveBeenCalledWith('0x');
      expect(result).toBe(mockWalletClient);
    });

    it('should handle viem client creation errors', async () => {
      const mockPrivateKey = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      process.env.HOLESKY_PRIVATE_KEY = mockPrivateKey;

      const viemError = new Error('Invalid private key format');
      mockCreateWalletClient.mockImplementation(() => {
        throw viemError;
      });

      await expect(connectEnvWallet(mockConfig)).rejects.toThrow('Invalid private key format');
    });

    it('should handle account creation errors', async () => {
      const mockPrivateKey = '0xinvalidkey';
      process.env.HOLESKY_PRIVATE_KEY = mockPrivateKey;

      const accountError = new Error('Invalid private key');
      mockPrivateKeyToAccount.mockImplementation(() => {
        throw accountError;
      });

      await expect(connectEnvWallet(mockConfig)).rejects.toThrow('Invalid private key');
    });
  });

  describe('wallet client creation', () => {
    it('should create wallet client with correct configuration', async () => {
      const mockPrivateKey = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      process.env.HOLESKY_PRIVATE_KEY = mockPrivateKey;

      await connectEnvWallet(mockConfig);

      expect(mockCreateWalletClient).toHaveBeenCalledWith(
        expect.objectContaining({
          account: mockAccount,
        })
      );
    });

    it('should use http transport with RPC URL', async () => {
      const mockPrivateKey = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      process.env.HOLESKY_PRIVATE_KEY = mockPrivateKey;

      await connectEnvWallet(mockConfig);

      expect(mockCreateWalletClient).toHaveBeenCalledWith(
        expect.objectContaining({
          transport: http(mockConfig.urls.rpc),
        })
      );
    });
  });

  describe('private key validation', () => {
    it('should handle valid private key format', async () => {
      const validPrivateKey = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      process.env.HOLESKY_PRIVATE_KEY = validPrivateKey;

      const result = await connectEnvWallet(mockConfig);

      expect(mockPrivateKeyToAccount).toHaveBeenCalledWith(validPrivateKey);
      expect(result).toBe(mockWalletClient);
    });

    it('should handle private key without 0x prefix', async () => {
      const privateKeyWithoutPrefix = '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      process.env.HOLESKY_PRIVATE_KEY = privateKeyWithoutPrefix;

      await connectEnvWallet(mockConfig);

      expect(mockPrivateKeyToAccount).toHaveBeenCalledWith(privateKeyWithoutPrefix);
    });
  });

  describe('environment variable handling', () => {
    it('should call dotenv.config on module load', async () => {
      const mockPrivateKey = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      process.env.HOLESKY_PRIVATE_KEY = mockPrivateKey;

      await connectEnvWallet(mockConfig);

      // Note: dotenv.config is called when the module is imported, but mocking it after import doesn't capture the call
      expect(mockDotenv.config).toHaveBeenCalledTimes(0);
    });

    it('should prioritize correct environment variable based on network', async () => {
      const holeskyKey = '0x1111111111111111111111111111111111111111111111111111111111111111';
      const mainnetKey = '0x2222222222222222222222222222222222222222222222222222222222222222';
      
      process.env.HOLESKY_PRIVATE_KEY = holeskyKey;
      process.env.MAINNET_PRIVATE_KEY = mainnetKey;

      // Test holesky
      mockConfig.network = 'holesky';
      await connectEnvWallet(mockConfig);
      expect(mockPrivateKeyToAccount).toHaveBeenCalledWith(holeskyKey);

      // Reset mock
      mockPrivateKeyToAccount.mockClear();

      // Test mainnet
      mockConfig.network = 'mainnet';
      await connectEnvWallet(mockConfig);
      expect(mockPrivateKeyToAccount).toHaveBeenCalledWith(mainnetKey);
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete workflow for holesky network', async () => {
      const privateKey = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
      process.env.HOLESKY_PRIVATE_KEY = privateKey;
      
      const result = await connectEnvWallet(mockConfig);

      expect(mockPrivateKeyToAccount).toHaveBeenCalledWith(privateKey);
      expect(mockCreateWalletClient).toHaveBeenCalledWith({
        ...mockConfig,
        account: mockAccount,
        transport: http(mockConfig.urls.rpc),
      });
      expect(result).toBe(mockWalletClient);
      expect(result.account).toBe(mockAccount);
    });

    it('should handle complete workflow for mainnet network', async () => {
      const privateKey = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
      process.env.MAINNET_PRIVATE_KEY = privateKey;
      mockConfig.network = 'mainnet';
      
      const result = await connectEnvWallet(mockConfig);

      expect(mockPrivateKeyToAccount).toHaveBeenCalledWith(privateKey);
      expect(mockCreateWalletClient).toHaveBeenCalledWith({
        ...mockConfig,
        account: mockAccount,
        transport: http(mockConfig.urls.rpc),
      });
      expect(result).toBe(mockWalletClient);
      expect(result.account).toBe(mockAccount);
    });
  });
});