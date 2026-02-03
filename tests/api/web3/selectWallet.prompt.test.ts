import { select } from '@inquirer/prompts';
import { WalletClient } from 'viem';
import { selectWalletPrompt, getWalletTypeFromArgs } from '../../../src/api/web3/selectWallet.prompt';
import connectEnvWallet from '../../../src/api/web3/connectEnvWallet';
import connectFrameWallet, { isFrameAvailable } from '../../../src/api/web3/connectFrameWallet';
import { INetworkConfig } from '../../../src/types/network.type';

// Mock dependencies
jest.mock('@inquirer/prompts', () => ({
  select: jest.fn(),
}));

jest.mock('../../../src/api/web3/connectEnvWallet');
jest.mock('../../../src/api/web3/connectFrameWallet', () => ({
  __esModule: true,
  default: jest.fn(),
  isFrameAvailable: jest.fn(),
}));

const mockSelect = select as jest.MockedFunction<typeof select>;
const mockConnectEnvWallet = connectEnvWallet as jest.MockedFunction<typeof connectEnvWallet>;
const mockConnectFrameWallet = connectFrameWallet as jest.MockedFunction<typeof connectFrameWallet>;
const mockIsFrameAvailable = isFrameAvailable as jest.MockedFunction<typeof isFrameAvailable>;

describe('selectWallet.prompt', () => {
  let mockConfig: INetworkConfig;
  let mockWalletClient: WalletClient;
  const originalArgv = process.argv;
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.argv = ['node', 'script.js'];
    process.env = { ...originalEnv };

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

    mockConnectEnvWallet.mockResolvedValue(mockWalletClient);
    mockConnectFrameWallet.mockResolvedValue(mockWalletClient);
  });

  afterEach(() => {
    process.argv = originalArgv;
    process.env = originalEnv;
  });

  describe('selectWalletPrompt', () => {
    describe('when both wallets are available', () => {
      beforeEach(() => {
        process.env.HOLESKY_PRIVATE_KEY = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
        mockIsFrameAvailable.mockResolvedValue(true);
      });

      it('should show selection prompt when both wallets are available', async () => {
        mockSelect.mockResolvedValue('env');

        await selectWalletPrompt(mockConfig);

        expect(mockSelect).toHaveBeenCalledWith({
          message: 'Select wallet to use',
          choices: expect.arrayContaining([
            expect.objectContaining({
              name: 'Environment Private Key',
              value: 'env',
              disabled: false,
            }),
            expect.objectContaining({
              name: 'Hardware Wallet (Frame)',
              value: 'frame',
              disabled: false,
            }),
          ]),
        });
      });

      it('should connect to env wallet when selected', async () => {
        mockSelect.mockResolvedValue('env');

        const result = await selectWalletPrompt(mockConfig);

        expect(mockConnectEnvWallet).toHaveBeenCalledWith(mockConfig);
        expect(result).toBe(mockWalletClient);
      });

      it('should connect to Frame wallet when selected', async () => {
        mockSelect.mockResolvedValue('frame');

        const result = await selectWalletPrompt(mockConfig);

        expect(mockConnectFrameWallet).toHaveBeenCalledWith(mockConfig);
        expect(result).toBe(mockWalletClient);
      });
    });

    describe('when only env wallet is available', () => {
      beforeEach(() => {
        process.env.HOLESKY_PRIVATE_KEY = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
        mockIsFrameAvailable.mockResolvedValue(false);
      });

      it('should auto-select env wallet without prompting', async () => {
        const consoleSpy = jest.spyOn(console, 'info').mockImplementation();

        const result = await selectWalletPrompt(mockConfig);

        expect(mockSelect).not.toHaveBeenCalled();
        expect(mockConnectEnvWallet).toHaveBeenCalledWith(mockConfig);
        expect(result).toBe(mockWalletClient);
        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Using Environment Private Key'));

        consoleSpy.mockRestore();
      });
    });

    describe('when only Frame wallet is available', () => {
      beforeEach(() => {
        delete process.env.HOLESKY_PRIVATE_KEY;
        delete process.env.MAINNET_PRIVATE_KEY;
        mockIsFrameAvailable.mockResolvedValue(true);
      });

      it('should auto-select Frame wallet without prompting', async () => {
        const consoleSpy = jest.spyOn(console, 'info').mockImplementation();

        const result = await selectWalletPrompt(mockConfig);

        expect(mockSelect).not.toHaveBeenCalled();
        expect(mockConnectFrameWallet).toHaveBeenCalledWith(mockConfig);
        expect(result).toBe(mockWalletClient);
        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Using Hardware Wallet (Frame)'));

        consoleSpy.mockRestore();
      });
    });

    describe('when no wallets are available', () => {
      beforeEach(() => {
        delete process.env.HOLESKY_PRIVATE_KEY;
        delete process.env.MAINNET_PRIVATE_KEY;
        mockIsFrameAvailable.mockResolvedValue(false);
      });

      it('should throw error when no wallet is available for holesky', async () => {
        await expect(selectWalletPrompt(mockConfig)).rejects.toThrow('No wallet available');
      });

      it('should throw error with correct env var name for mainnet', async () => {
        mockConfig.network = 'mainnet';

        await expect(selectWalletPrompt(mockConfig)).rejects.toThrow('MAINNET_PRIVATE_KEY');
      });

      it('should mention Frame in the error message', async () => {
        await expect(selectWalletPrompt(mockConfig)).rejects.toThrow('Frame wallet');
      });
    });

    describe('network-specific env key checking', () => {
      beforeEach(() => {
        mockIsFrameAvailable.mockResolvedValue(false);
      });

      it('should check HOLESKY_PRIVATE_KEY for holesky network', async () => {
        process.env.HOLESKY_PRIVATE_KEY = '0x1234';
        delete process.env.MAINNET_PRIVATE_KEY;

        const consoleSpy = jest.spyOn(console, 'info').mockImplementation();

        await selectWalletPrompt(mockConfig);

        expect(mockConnectEnvWallet).toHaveBeenCalled();
        consoleSpy.mockRestore();
      });

      it('should check MAINNET_PRIVATE_KEY for mainnet network', async () => {
        mockConfig.network = 'mainnet';
        process.env.MAINNET_PRIVATE_KEY = '0x5678';
        delete process.env.HOLESKY_PRIVATE_KEY;

        const consoleSpy = jest.spyOn(console, 'info').mockImplementation();

        await selectWalletPrompt(mockConfig);

        expect(mockConnectEnvWallet).toHaveBeenCalled();
        consoleSpy.mockRestore();
      });

      it('should return false for unknown network', async () => {
        mockConfig.network = 'unknown' as any;
        delete process.env.HOLESKY_PRIVATE_KEY;
        delete process.env.MAINNET_PRIVATE_KEY;

        await expect(selectWalletPrompt(mockConfig)).rejects.toThrow('No wallet available');
      });
    });

    describe('disabled choices', () => {
      it('should disable env wallet option when no env key', async () => {
        delete process.env.HOLESKY_PRIVATE_KEY;
        mockIsFrameAvailable.mockResolvedValue(true);

        const consoleSpy = jest.spyOn(console, 'info').mockImplementation();
        await selectWalletPrompt(mockConfig);
        consoleSpy.mockRestore();

        // Since only Frame is available, it auto-selects without showing the prompt
        expect(mockSelect).not.toHaveBeenCalled();
      });

      it('should disable Frame option when Frame not available', async () => {
        process.env.HOLESKY_PRIVATE_KEY = '0x1234';
        mockIsFrameAvailable.mockResolvedValue(false);

        const consoleSpy = jest.spyOn(console, 'info').mockImplementation();
        await selectWalletPrompt(mockConfig);
        consoleSpy.mockRestore();

        // Since only env is available, it auto-selects without showing the prompt
        expect(mockSelect).not.toHaveBeenCalled();
      });
    });

    describe('unknown wallet type handling', () => {
      it('should throw error for unknown wallet type', async () => {
        process.env.HOLESKY_PRIVATE_KEY = '0x1234';
        mockIsFrameAvailable.mockResolvedValue(true);
        mockSelect.mockResolvedValue('unknown' as any);

        await expect(selectWalletPrompt(mockConfig)).rejects.toThrow('Unknown wallet type');
      });
    });
  });

  describe('getWalletTypeFromArgs', () => {
    it('should return undefined when no --wallet argument', () => {
      process.argv = ['node', 'script.js'];

      const result = getWalletTypeFromArgs();

      expect(result).toBeUndefined();
    });

    it('should return "env" when --wallet env is provided', () => {
      process.argv = ['node', 'script.js', '--wallet', 'env'];

      const result = getWalletTypeFromArgs();

      expect(result).toBe('env');
    });

    it('should return "frame" when --wallet frame is provided', () => {
      process.argv = ['node', 'script.js', '--wallet', 'frame'];

      const result = getWalletTypeFromArgs();

      expect(result).toBe('frame');
    });

    it('should be case insensitive', () => {
      process.argv = ['node', 'script.js', '--wallet', 'ENV'];
      expect(getWalletTypeFromArgs()).toBe('env');

      process.argv = ['node', 'script.js', '--wallet', 'FRAME'];
      expect(getWalletTypeFromArgs()).toBe('frame');

      process.argv = ['node', 'script.js', '--wallet', 'Env'];
      expect(getWalletTypeFromArgs()).toBe('env');
    });

    it('should return undefined for invalid wallet type', () => {
      process.argv = ['node', 'script.js', '--wallet', 'invalid'];

      const result = getWalletTypeFromArgs();

      expect(result).toBeUndefined();
    });

    it('should return undefined when --wallet has no value', () => {
      process.argv = ['node', 'script.js', '--wallet'];

      const result = getWalletTypeFromArgs();

      expect(result).toBeUndefined();
    });

    it('should handle --wallet in different positions', () => {
      process.argv = ['node', 'script.js', '--network', 'mainnet', '--wallet', 'frame', '--verbose'];

      const result = getWalletTypeFromArgs();

      expect(result).toBe('frame');
    });
  });
});
