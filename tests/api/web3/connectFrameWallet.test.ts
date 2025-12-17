import { createWalletClient, custom, WalletClient } from 'viem';
import { holesky, mainnet } from 'viem/chains';
import connectFrameWallet, { isFrameAvailable, getFrameAccounts } from '../../../src/api/web3/connectFrameWallet';
import { INetworkConfig } from '../../../src/types/network.type';

// Mock viem
jest.mock('viem', () => ({
  createWalletClient: jest.fn(),
  custom: jest.fn(),
}));

jest.mock('viem/chains', () => ({
  holesky: { id: 17000, name: 'Holesky' },
  mainnet: { id: 1, name: 'Ethereum' },
}));

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

const mockCreateWalletClient = createWalletClient as jest.MockedFunction<typeof createWalletClient>;
const mockCustom = custom as jest.MockedFunction<typeof custom>;

describe('connectFrameWallet', () => {
  let mockConfig: INetworkConfig;
  let mockWalletClient: WalletClient;

  beforeEach(() => {
    jest.clearAllMocks();

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
      account: { address: '0xabcdef1234567890abcdef1234567890abcdef12' },
      chain: { id: 17000 },
      transport: {},
    } as any;

    mockCreateWalletClient.mockReturnValue(mockWalletClient as any);
    mockCustom.mockReturnValue({} as any);
  });

  describe('isFrameAvailable', () => {
    it('should return true when Frame responds with accounts', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jsonrpc: '2.0',
          id: 1,
          result: ['0x1234567890abcdef1234567890abcdef12345678'],
        }),
      });

      const result = await isFrameAvailable();

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith('http://127.0.0.1:1248', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_accounts',
          params: [],
        }),
      });
    });

    it('should return true when Frame responds with error code 4001 (no account selected)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jsonrpc: '2.0',
          id: 1,
          error: { code: 4001, message: 'No account selected' },
        }),
      });

      const result = await isFrameAvailable();

      expect(result).toBe(true);
    });

    it('should return false when Frame is not running', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Connection refused'));

      const result = await isFrameAvailable();

      expect(result).toBe(false);
    });

    it('should return false when Frame returns non-ok response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Internal Server Error',
      });

      const result = await isFrameAvailable();

      expect(result).toBe(false);
    });

    it('should return false for other RPC errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jsonrpc: '2.0',
          id: 1,
          error: { code: -32000, message: 'Some other error' },
        }),
      });

      const result = await isFrameAvailable();

      expect(result).toBe(false);
    });
  });

  describe('getFrameAccounts', () => {
    it('should return accounts when available', async () => {
      const mockAccounts = ['0x1234567890abcdef1234567890abcdef12345678', '0xabcdef1234567890abcdef1234567890abcdef12'];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jsonrpc: '2.0',
          id: 1,
          result: mockAccounts,
        }),
      });

      const result = await getFrameAccounts();

      expect(result).toEqual(mockAccounts);
    });

    it('should return empty array when error code 4001 (no account selected)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jsonrpc: '2.0',
          id: 1,
          error: { code: 4001, message: 'No account selected' },
        }),
      });

      const result = await getFrameAccounts();

      expect(result).toEqual([]);
    });

    it('should throw error for other RPC errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jsonrpc: '2.0',
          id: 1,
          error: { code: -32000, message: 'Internal error' },
        }),
      });

      await expect(getFrameAccounts()).rejects.toThrow('Internal error');
    });

    it('should throw error when fetch fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(getFrameAccounts()).rejects.toThrow('Network error');
    });

    it('should throw error when response is not ok', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Bad Gateway',
      });

      await expect(getFrameAccounts()).rejects.toThrow('Frame RPC request failed: Bad Gateway');
    });
  });

  describe('connectFrameWallet', () => {
    const mockAccounts = ['0xabcdef1234567890abcdef1234567890abcdef12'];

    beforeEach(() => {
      // Default successful mocks for eth_accounts and wallet_switchEthereumChain
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ jsonrpc: '2.0', id: 1, result: mockAccounts }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ jsonrpc: '2.0', id: 1, result: mockAccounts }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ jsonrpc: '2.0', id: 1, result: null }),
        });
    });

    it('should connect successfully to Frame wallet on holesky', async () => {
      const result = await connectFrameWallet(mockConfig);

      expect(result).toBe(mockWalletClient);
      expect(mockCreateWalletClient).toHaveBeenCalledWith({
        account: mockAccounts[0],
        chain: holesky,
        transport: expect.anything(),
      });
    });

    it('should connect successfully to Frame wallet on mainnet', async () => {
      mockConfig.network = 'mainnet';
      mockConfig.chainId = 1;

      const result = await connectFrameWallet(mockConfig);

      expect(result).toBe(mockWalletClient);
      expect(mockCreateWalletClient).toHaveBeenCalledWith({
        account: mockAccounts[0],
        chain: mainnet,
        transport: expect.anything(),
      });
    });

    it('should throw error when Frame is not available', async () => {
      mockFetch.mockReset();
      mockFetch.mockRejectedValueOnce(new Error('Connection refused'));

      await expect(connectFrameWallet(mockConfig)).rejects.toThrow(
        'Frame wallet is not available. Please ensure Frame is installed and running.',
      );
    });

    it('should throw error when no accounts are selected', async () => {
      mockFetch.mockReset();
      // isFrameAvailable check - returns accounts
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ jsonrpc: '2.0', id: 1, result: [] }),
      });
      // getFrameAccounts - returns empty
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ jsonrpc: '2.0', id: 1, result: [] }),
      });

      await expect(connectFrameWallet(mockConfig)).rejects.toThrow('No account selected in Frame');
    });

    it('should throw error when chain is not configured in Frame', async () => {
      mockFetch.mockReset();
      // isFrameAvailable
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ jsonrpc: '2.0', id: 1, result: mockAccounts }),
      });
      // getFrameAccounts
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ jsonrpc: '2.0', id: 1, result: mockAccounts }),
      });
      // wallet_switchEthereumChain - chain not found
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jsonrpc: '2.0',
          id: 1,
          error: { code: 4902, message: 'Unrecognized chain ID' },
        }),
      });

      await expect(connectFrameWallet(mockConfig)).rejects.toThrow('Chain 17000 not configured in Frame');
    });

    it('should switch chain with correct hex format', async () => {
      await connectFrameWallet(mockConfig);

      // Check the third call (wallet_switchEthereumChain)
      const switchChainCall = mockFetch.mock.calls[2];
      const body = JSON.parse(switchChainCall[1].body);

      expect(body.method).toBe('wallet_switchEthereumChain');
      expect(body.params).toEqual([{ chainId: '0x4268' }]); // 17000 in hex
    });

    it('should use custom transport with Frame provider', async () => {
      await connectFrameWallet(mockConfig);

      expect(mockCustom).toHaveBeenCalled();
      expect(mockCreateWalletClient).toHaveBeenCalledWith(
        expect.objectContaining({
          transport: expect.anything(),
        }),
      );
    });

    it('should use the first account from Frame', async () => {
      const multipleAccounts = [
        '0x1111111111111111111111111111111111111111',
        '0x2222222222222222222222222222222222222222',
      ];

      mockFetch.mockReset();
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ jsonrpc: '2.0', id: 1, result: multipleAccounts }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ jsonrpc: '2.0', id: 1, result: multipleAccounts }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ jsonrpc: '2.0', id: 1, result: null }),
        });

      await connectFrameWallet(mockConfig);

      expect(mockCreateWalletClient).toHaveBeenCalledWith(
        expect.objectContaining({
          account: multipleAccounts[0],
        }),
      );
    });

    it('should rethrow unexpected errors during chain switch', async () => {
      mockFetch.mockReset();
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ jsonrpc: '2.0', id: 1, result: mockAccounts }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ jsonrpc: '2.0', id: 1, result: mockAccounts }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            jsonrpc: '2.0',
            id: 1,
            error: { code: -32000, message: 'Unknown error' },
          }),
        });

      await expect(connectFrameWallet(mockConfig)).rejects.toThrow('Unknown error');
    });
  });

  describe('FrameRpcError', () => {
    it('should include error code in thrown errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jsonrpc: '2.0',
          id: 1,
          error: { code: 4100, message: 'Unauthorized' },
        }),
      });

      await expect(getFrameAccounts()).rejects.toMatchObject({
        message: 'Unauthorized',
        code: 4100,
        name: 'FrameRpcError',
      });
    });
  });

  describe('Frame provider', () => {
    it('should create a provider that proxies requests to Frame', async () => {
      const mockAccounts = ['0xabcdef1234567890abcdef1234567890abcdef12'];

      // Set up successful mocks for the connection flow
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ jsonrpc: '2.0', id: 1, result: mockAccounts }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ jsonrpc: '2.0', id: 1, result: mockAccounts }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ jsonrpc: '2.0', id: 1, result: null }),
        });

      // Connect to capture the provider
      await connectFrameWallet(mockConfig);

      // Get the provider passed to custom()
      const providerArg = mockCustom.mock.calls[0][0];
      expect(providerArg).toHaveProperty('request');
      expect(typeof providerArg.request).toBe('function');
    });
  });
});
