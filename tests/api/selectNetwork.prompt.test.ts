import { select } from '@inquirer/prompts';
import { selectNetworkPrompt } from '../../src/api/selectNetwork.prompt';
import HoleskyConfig from '../../src/config/holesky.config.json';
import MainnetConfig from '../../src/config/mainnet.config.json';

// Mock inquirer
jest.mock('@inquirer/prompts');

const mockSelect = select as jest.MockedFunction<typeof select>;

describe('selectNetworkPrompt', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('network selection interface', () => {
    it('should display correct network choices', async () => {
      mockSelect.mockResolvedValue('holesky');

      await selectNetworkPrompt();

      expect(mockSelect).toHaveBeenCalledWith({
        message: 'Select the network you want to use',
        choices: [
          {
            name: 'Mainnet',
            value: 'mainnet',
          },
          {
            name: 'Holesky',
            value: 'holesky',
          },
        ],
      });
    });
  });

  describe('holesky network selection', () => {
    it('should return holesky configuration when holesky is selected', async () => {
      mockSelect.mockResolvedValue('holesky');

      const result = await selectNetworkPrompt();

      expect(result).toEqual(HoleskyConfig);
      expect(result.network).toBe('holesky');
      expect((result as any).chainId).toBe(17000);
      expect(result.urls.rpc).toBe('https://holesky.drpc.org');
      expect(result.urls.explorer).toBe('https://holesky.etherscan.io/');
    });

    it('should return correct holesky contract addresses', async () => {
      mockSelect.mockResolvedValue('holesky');

      const result = await selectNetworkPrompt();

      expect(result.contracts).toEqual({
        DAO: '0x3b7FFC62241647369d28881479b907DFF6e71882',
        VotingToken: '0x6490E12d480549D333499236fF2Ba6676C296011',
        TaikoBridge: '0xA098b76a3Dd499D3F6D58D8AcCaFC8efBFd06807',
        MultisigPlugin: '0xCBD72Ba85bccF95BD39AA7A1bdD3F2213C642cd4',
        EmergencyMultisigPlugin: '0x53b6A327aFaf16F842Ce46fF18019418dd629bE7',
        OptimisticTokenVotingPlugin: '0xB1807C3cE200016b5bdAFe0B0df0A91853D24Cb3',
        SignerList: '0xE919a2e4FE5b029d3C835622dfaF1d09FdF2E4C8',
        EncryptionRegistry: '0xb1CB4ae1f00204Bc752a717f1Bf6d4cDA8609099',
        DelegationWall: '0x2994078a949D679d62744D136f295aba4Bc42421',
      });
    });

    it('should return correct holesky subgraph URL', async () => {
      mockSelect.mockResolvedValue('holesky');

      const result = await selectNetworkPrompt();

      expect(result.subgraph).toBe(
        'https://api.goldsky.com/api/public/project_clz85cxrvng3n01ughcv5e7hg/subgraphs/dao-holesky/holesky/gn'
      );
    });
  });

  describe('mainnet network selection', () => {
    it('should return mainnet configuration when mainnet is selected', async () => {
      mockSelect.mockResolvedValue('mainnet');

      const result = await selectNetworkPrompt();

      expect(result).toEqual(MainnetConfig);
      expect(result.network).toBe('mainnet');
      expect((result as any).chainId).toBe(1);
      expect(result.urls.rpc).toBe('https://eth.llamarpc.com');
      expect(result.urls.explorer).toBe('https://etherscan.io/');
    });

    it('should return correct mainnet contract addresses', async () => {
      mockSelect.mockResolvedValue('mainnet');

      const result = await selectNetworkPrompt();

      expect(result.contracts).toEqual({
        DAO: '0x9CDf589C941ee81D75F34d3755671d614f7cf261',
        VotingToken: '0x10dea67478c5F8C5E2D90e5E9B26dBe60c54d800',
        TaikoBridge: '0xd60247c6848B7Ca29eDdF63AA924E53dB6Ddd8EC',
        MultisigPlugin: '0xD7dA1C25E915438720692bC55eb3a7170cA90321',
        EmergencyMultisigPlugin: '0x2AffADEb2ef5e1F2a7F58964ee191F1e88317ECd',
        OptimisticTokenVotingPlugin: '0x989E348275b659d36f8751ea1c10D146211650BE',
        SignerList: '0x0F95E6968EC1B28c794CF1aD99609431de5179c2',
        EncryptionRegistry: '0x2eFDb93a3B87b930E553d504db67Ee41c69C42d1',
        DelegationWall: '0x402816c92f7F978C855190F367B3C21239efE692',
      });
    });

    it('should return correct mainnet subgraph URL', async () => {
      mockSelect.mockResolvedValue('mainnet');

      const result = await selectNetworkPrompt();

      expect(result.subgraph).toBe(
        'https://api.goldsky.com/api/public/project_clz85cxrvng3n01ughcv5e7hg/subgraphs/dao/mainnet/gn'
      );
    });
  });

  describe('error handling', () => {
    it('should throw error for unsupported network', async () => {
      mockSelect.mockResolvedValue('unsupported-network');

      await expect(selectNetworkPrompt()).rejects.toThrow(
        'Network unsupported-network is not supported.'
      );
    });

    it('should throw error for undefined network selection', async () => {
      mockSelect.mockResolvedValue(undefined);

      await expect(selectNetworkPrompt()).rejects.toThrow(
        'Network undefined is not supported.'
      );
    });

    it('should throw error for null network selection', async () => {
      mockSelect.mockResolvedValue(null);

      await expect(selectNetworkPrompt()).rejects.toThrow(
        'Network null is not supported.'
      );
    });

    it('should throw error for empty string network selection', async () => {
      mockSelect.mockResolvedValue('');

      await expect(selectNetworkPrompt()).rejects.toThrow(
        'Network  is not supported.'
      );
    });
  });

  describe('configuration validation', () => {
    it('should return valid INetworkConfig structure for holesky', async () => {
      mockSelect.mockResolvedValue('holesky');

      const result = await selectNetworkPrompt();

      // Validate structure
      expect(result).toHaveProperty('network');
      expect(result).toHaveProperty('urls');
      expect(result).toHaveProperty('urls.rpc');
      expect(result).toHaveProperty('urls.explorer');
      expect(result).toHaveProperty('subgraph');
      expect(result).toHaveProperty('contracts');
      
      // Validate contract properties
      expect(result.contracts).toHaveProperty('DAO');
      expect(result.contracts).toHaveProperty('VotingToken');
      expect(result.contracts).toHaveProperty('TaikoBridge');
      expect(result.contracts).toHaveProperty('MultisigPlugin');
      expect(result.contracts).toHaveProperty('EmergencyMultisigPlugin');
      expect(result.contracts).toHaveProperty('OptimisticTokenVotingPlugin');
      expect(result.contracts).toHaveProperty('SignerList');
      expect(result.contracts).toHaveProperty('EncryptionRegistry');
      expect(result.contracts).toHaveProperty('DelegationWall');

      // Validate types
      expect(typeof result.network).toBe('string');
      expect(typeof result.urls.rpc).toBe('string');
      expect(typeof result.urls.explorer).toBe('string');
      expect(typeof result.subgraph).toBe('string');
    });

    it('should return valid INetworkConfig structure for mainnet', async () => {
      mockSelect.mockResolvedValue('mainnet');

      const result = await selectNetworkPrompt();

      // Validate structure
      expect(result).toHaveProperty('network');
      expect(result).toHaveProperty('urls');
      expect(result).toHaveProperty('urls.rpc');
      expect(result).toHaveProperty('urls.explorer');
      expect(result).toHaveProperty('subgraph');
      expect(result).toHaveProperty('contracts');
      
      // Validate contract properties
      expect(result.contracts).toHaveProperty('DAO');
      expect(result.contracts).toHaveProperty('VotingToken');
      expect(result.contracts).toHaveProperty('TaikoBridge');
      expect(result.contracts).toHaveProperty('MultisigPlugin');
      expect(result.contracts).toHaveProperty('EmergencyMultisigPlugin');
      expect(result.contracts).toHaveProperty('OptimisticTokenVotingPlugin');
      expect(result.contracts).toHaveProperty('SignerList');
      expect(result.contracts).toHaveProperty('EncryptionRegistry');
      expect(result.contracts).toHaveProperty('DelegationWall');

      // Validate types
      expect(typeof result.network).toBe('string');
      expect(typeof result.urls.rpc).toBe('string');
      expect(typeof result.urls.explorer).toBe('string');
      expect(typeof result.subgraph).toBe('string');
    });

    it('should have different configurations for different networks', async () => {
      // Get holesky config
      mockSelect.mockResolvedValueOnce('holesky');
      const holeskyResult = await selectNetworkPrompt();

      // Get mainnet config
      mockSelect.mockResolvedValueOnce('mainnet');
      const mainnetResult = await selectNetworkPrompt();

      // Configurations should be different
      expect(holeskyResult.network).not.toBe(mainnetResult.network);
      expect(holeskyResult.urls.rpc).not.toBe(mainnetResult.urls.rpc);
      expect(holeskyResult.subgraph).not.toBe(mainnetResult.subgraph);
      expect(holeskyResult.contracts.DAO).not.toBe(mainnetResult.contracts.DAO);
    });
  });

  describe('address format validation', () => {
    it('should have valid ethereum addresses for holesky contracts', async () => {
      mockSelect.mockResolvedValue('holesky');

      const result = await selectNetworkPrompt();

      Object.values(result.contracts).forEach((address) => {
        expect(address).toMatch(/^0x[a-fA-F0-9]{40}$/);
      });
    });

    it('should have valid ethereum addresses for mainnet contracts', async () => {
      mockSelect.mockResolvedValue('mainnet');

      const result = await selectNetworkPrompt();

      Object.values(result.contracts).forEach((address) => {
        expect(address).toMatch(/^0x[a-fA-F0-9]{40}$/);
      });
    });
  });

  describe('URL format validation', () => {
    it('should have valid URLs for holesky', async () => {
      mockSelect.mockResolvedValue('holesky');

      const result = await selectNetworkPrompt();

      expect(result.urls.rpc).toMatch(/^https?:\/\/.+/);
      expect(result.urls.explorer).toMatch(/^https?:\/\/.+/);
      expect(result.subgraph).toMatch(/^https?:\/\/.+/);
    });

    it('should have valid URLs for mainnet', async () => {
      mockSelect.mockResolvedValue('mainnet');

      const result = await selectNetworkPrompt();

      expect(result.urls.rpc).toMatch(/^https?:\/\/.+/);
      expect(result.urls.explorer).toMatch(/^https?:\/\/.+/);
      expect(result.subgraph).toMatch(/^https?:\/\/.+/);
    });
  });

  describe('interaction flow', () => {
    it('should be awaitable', async () => {
      mockSelect.mockResolvedValue('holesky');

      // Should not throw when awaited
      await expect(selectNetworkPrompt()).resolves.toBeDefined();
    });

    it('should handle prompt cancellation', async () => {
      const cancelError = new Error('User cancelled prompt');
      mockSelect.mockRejectedValue(cancelError);

      await expect(selectNetworkPrompt()).rejects.toThrow('User cancelled prompt');
    });

    it('should handle prompt errors', async () => {
      const promptError = new Error('Prompt input error');
      mockSelect.mockRejectedValue(promptError);

      await expect(selectNetworkPrompt()).rejects.toThrow('Prompt input error');
    });
  });
});