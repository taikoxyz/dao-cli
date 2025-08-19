import { createPublicClient, createWalletClient, http, Address } from 'viem';
import { holesky, mainnet } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { getPublicClient, getWalletClient } from '../../src/api/viem';
import { INetworkConfig } from '../../src/types/network.type';

// Mock viem modules
jest.mock('viem');
jest.mock('viem/chains');
jest.mock('viem/accounts');

const mockCreatePublicClient = createPublicClient as jest.MockedFunction<typeof createPublicClient>;
const mockCreateWalletClient = createWalletClient as jest.MockedFunction<typeof createWalletClient>;
const mockHttp = http as jest.MockedFunction<typeof http>;
const mockPrivateKeyToAccount = privateKeyToAccount as jest.MockedFunction<typeof privateKeyToAccount>;

describe('viem client utilities', () => {
  let mockConfig: INetworkConfig;
  let mockPublicClient: any;
  let mockWalletClient: any;
  let mockTransport: any;
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
        DAO: '0x1234567890abcdef1234567890abcdef12345678' as Address,
        VotingToken: '0x2345678901abcdef2345678901abcdef23456789' as Address,
        TaikoBridge: '0x3456789012abcdef3456789012abcdef34567890' as Address,
        MultisigPlugin: '0x4567890123abcdef4567890123abcdef45678901' as Address,
        EmergencyMultisigPlugin: '0x5678901234abcdef5678901234abcdef56789012' as Address,
        OptimisticTokenVotingPlugin: '0x6789012345abcdef6789012345abcdef67890123' as Address,
        SignerList: '0x7890123456abcdef7890123456abcdef78901234' as Address,
        EncryptionRegistry: '0x8901234567abcdef8901234567abcdef89012345' as Address,
        DelegationWall: '0x9012345678abcdef9012345678abcdef90123456' as Address,
      },
    };

    mockPublicClient = {
      readContract: jest.fn(),
      getBlockNumber: jest.fn(),
    };

    mockWalletClient = {
      account: {
        address: '0xabcdef1234567890abcdef1234567890abcdef12',
      },
      writeContract: jest.fn(),
    };

    mockTransport = {
      url: 'https://rpc.holesky.ethpandaops.io',
      type: 'http',
    };

    mockAccount = {
      address: '0xabcdef1234567890abcdef1234567890abcdef12' as Address,
      publicKey: '0x1234567890abcdef',
    };

    mockCreatePublicClient.mockReturnValue(mockPublicClient);
    mockCreateWalletClient.mockReturnValue(mockWalletClient);
    mockHttp.mockReturnValue(mockTransport);
    mockPrivateKeyToAccount.mockReturnValue(mockAccount);
  });

  describe('getPublicClient', () => {
    it('should create public client for holesky network', () => {
      mockConfig.network = 'holesky';

      const result = getPublicClient(mockConfig);

      expect(mockCreatePublicClient).toHaveBeenCalledWith({
        chain: holesky,
        transport: mockTransport,
      });
      expect(mockHttp).toHaveBeenCalledWith(mockConfig.urls.rpc);
      expect(result).toBe(mockPublicClient);
    });

    it('should create public client for mainnet network', () => {
      mockConfig.network = 'mainnet';
      mockConfig.urls.rpc = 'https://mainnet.rpc.example.com';

      const result = getPublicClient(mockConfig);

      expect(mockCreatePublicClient).toHaveBeenCalledWith({
        chain: mainnet,
        transport: mockTransport,
      });
      expect(mockHttp).toHaveBeenCalledWith('https://mainnet.rpc.example.com');
      expect(result).toBe(mockPublicClient);
    });

    it('should default to mainnet for unknown networks', () => {
      mockConfig.network = 'unknown-network';

      const result = getPublicClient(mockConfig);

      expect(mockCreatePublicClient).toHaveBeenCalledWith({
        chain: mainnet, // Should default to mainnet
        transport: mockTransport,
      });
      expect(result).toBe(mockPublicClient);
    });

    it('should handle different RPC URLs', () => {
      const customRpcUrl = 'https://custom-rpc.example.com';
      mockConfig.urls.rpc = customRpcUrl;

      getPublicClient(mockConfig);

      expect(mockHttp).toHaveBeenCalledWith(customRpcUrl);
    });
  });

  describe('getWalletClient', () => {
    const privateKey = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef' as Address;

    it('should create wallet client for holesky network', () => {
      const configWithPrivateKey = { ...mockConfig, privateKey };

      const result = getWalletClient(configWithPrivateKey);

      expect(mockPrivateKeyToAccount).toHaveBeenCalledWith(privateKey);
      expect(mockCreateWalletClient).toHaveBeenCalledWith({
        account: mockAccount,
        chain: holesky,
        transport: mockTransport,
      });
      expect(mockHttp).toHaveBeenCalledWith(mockConfig.urls.rpc);
      expect(result).toBe(mockWalletClient);
    });

    it('should create wallet client for mainnet network', () => {
      const configWithPrivateKey = {
        ...mockConfig,
        network: 'mainnet',
        privateKey,
        urls: {
          ...mockConfig.urls,
          rpc: 'https://mainnet.rpc.example.com',
        },
      };

      const result = getWalletClient(configWithPrivateKey);

      expect(mockPrivateKeyToAccount).toHaveBeenCalledWith(privateKey);
      expect(mockCreateWalletClient).toHaveBeenCalledWith({
        account: mockAccount,
        chain: mainnet,
        transport: mockTransport,
      });
      expect(mockHttp).toHaveBeenCalledWith('https://mainnet.rpc.example.com');
      expect(result).toBe(mockWalletClient);
    });

    it('should default to mainnet for unknown networks', () => {
      const configWithPrivateKey = {
        ...mockConfig,
        network: 'unknown-network',
        privateKey,
      };

      const result = getWalletClient(configWithPrivateKey);

      expect(mockCreateWalletClient).toHaveBeenCalledWith({
        account: mockAccount,
        chain: mainnet, // Should default to mainnet
        transport: mockTransport,
      });
      expect(result).toBe(mockWalletClient);
    });

    it('should handle different private keys', () => {
      const differentPrivateKey = '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890' as Address;
      const configWithPrivateKey = { ...mockConfig, privateKey: differentPrivateKey };

      getWalletClient(configWithPrivateKey);

      expect(mockPrivateKeyToAccount).toHaveBeenCalledWith(differentPrivateKey);
    });

    it('should use custom RPC URL with wallet client', () => {
      const customRpcUrl = 'https://custom-wallet-rpc.example.com';
      const configWithPrivateKey = {
        ...mockConfig,
        privateKey,
        urls: {
          ...mockConfig.urls,
          rpc: customRpcUrl,
        },
      };

      getWalletClient(configWithPrivateKey);

      expect(mockHttp).toHaveBeenCalledWith(customRpcUrl);
    });
  });

  describe('network chain selection', () => {
    it('should use holesky chain when network is holesky', () => {
      mockConfig.network = 'holesky';

      getPublicClient(mockConfig);

      expect(mockCreatePublicClient).toHaveBeenCalledWith(
        expect.objectContaining({
          chain: holesky,
        }),
      );
    });

    it('should use mainnet chain when network is mainnet', () => {
      mockConfig.network = 'mainnet';

      getPublicClient(mockConfig);

      expect(mockCreatePublicClient).toHaveBeenCalledWith(
        expect.objectContaining({
          chain: mainnet,
        }),
      );
    });

    it('should handle case sensitivity in network names', () => {
      mockConfig.network = 'HOLESKY';

      getPublicClient(mockConfig);

      // Should default to mainnet as it's not exact match for 'holesky'
      expect(mockCreatePublicClient).toHaveBeenCalledWith(
        expect.objectContaining({
          chain: mainnet,
        }),
      );
    });
  });

  describe('transport configuration', () => {
    it('should create http transport with correct URL for public client', () => {
      const rpcUrl = 'https://test-rpc.example.com';
      mockConfig.urls.rpc = rpcUrl;

      getPublicClient(mockConfig);

      expect(mockHttp).toHaveBeenCalledWith(rpcUrl);
      expect(mockCreatePublicClient).toHaveBeenCalledWith(
        expect.objectContaining({
          transport: mockTransport,
        }),
      );
    });

    it('should create http transport with correct URL for wallet client', () => {
      const rpcUrl = 'https://test-wallet-rpc.example.com';
      const configWithPrivateKey = {
        ...mockConfig,
        privateKey: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef' as Address,
        urls: {
          ...mockConfig.urls,
          rpc: rpcUrl,
        },
      };

      getWalletClient(configWithPrivateKey);

      expect(mockHttp).toHaveBeenCalledWith(rpcUrl);
      expect(mockCreateWalletClient).toHaveBeenCalledWith(
        expect.objectContaining({
          transport: mockTransport,
        }),
      );
    });
  });

  describe('account creation for wallet client', () => {
    it('should create account from private key', () => {
      const privateKey = '0xabc123def456abc123def456abc123def456abc123def456abc123def456abc1' as Address;
      const configWithPrivateKey = { ...mockConfig, privateKey };

      getWalletClient(configWithPrivateKey);

      expect(mockPrivateKeyToAccount).toHaveBeenCalledWith(privateKey);
      expect(mockCreateWalletClient).toHaveBeenCalledWith(
        expect.objectContaining({
          account: mockAccount,
        }),
      );
    });

    it('should handle different private key formats', () => {
      // Test without 0x prefix
      const privateKeyNoPrefix = 'abc123def456abc123def456abc123def456abc123def456abc123def456abc1' as Address;
      const configWithPrivateKey = { ...mockConfig, privateKey: privateKeyNoPrefix };

      getWalletClient(configWithPrivateKey);

      expect(mockPrivateKeyToAccount).toHaveBeenCalledWith(privateKeyNoPrefix);
    });
  });

  describe('integration scenarios', () => {
    it('should work with complete holesky configuration', () => {
      const privateKey = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef' as Address;
      const holeskyConfig = {
        ...mockConfig,
        network: 'holesky',
        urls: {
          rpc: 'https://rpc.holesky.ethpandaops.io',
          explorer: 'https://holesky.etherscan.io',
        },
      };

      // Test public client
      const publicClient = getPublicClient(holeskyConfig);
      expect(publicClient).toBe(mockPublicClient);
      expect(mockCreatePublicClient).toHaveBeenCalledWith({
        chain: holesky,
        transport: mockTransport,
      });

      // Test wallet client
      const walletClient = getWalletClient({ ...holeskyConfig, privateKey });
      expect(walletClient).toBe(mockWalletClient);
      expect(mockCreateWalletClient).toHaveBeenCalledWith({
        account: mockAccount,
        chain: holesky,
        transport: mockTransport,
      });
    });

    it('should work with complete mainnet configuration', () => {
      const privateKey = '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890' as Address;
      const mainnetConfig = {
        ...mockConfig,
        network: 'mainnet',
        urls: {
          rpc: 'https://mainnet.infura.io/v3/api-key',
          explorer: 'https://etherscan.io',
        },
      };

      // Test public client
      const publicClient = getPublicClient(mainnetConfig);
      expect(publicClient).toBe(mockPublicClient);
      expect(mockCreatePublicClient).toHaveBeenCalledWith({
        chain: mainnet,
        transport: mockTransport,
      });

      // Test wallet client
      const walletClient = getWalletClient({ ...mainnetConfig, privateKey });
      expect(walletClient).toBe(mockWalletClient);
      expect(mockCreateWalletClient).toHaveBeenCalledWith({
        account: mockAccount,
        chain: mainnet,
        transport: mockTransport,
      });
    });
  });
});
