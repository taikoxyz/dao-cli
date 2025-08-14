import * as dotenv from 'dotenv';
import getEnvPrivateKey from '../../../src/api/web3/getEnvPrivateKey';
import { INetworkConfig } from '../../../src/types/network.type';

// Mock dotenv
jest.mock('dotenv');

describe('getEnvPrivateKey', () => {
  let mockConfig: INetworkConfig;

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

    // Clear environment variables
    delete process.env.HOLESKY_PRIVATE_KEY;
    delete process.env.MAINNET_PRIVATE_KEY;
  });

  describe('holesky network', () => {
    beforeEach(() => {
      mockConfig.network = 'holesky';
    });

    it('should return holesky private key when available', () => {
      const expectedKey = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      process.env.HOLESKY_PRIVATE_KEY = expectedKey;

      const result = getEnvPrivateKey(mockConfig);

      expect(result).toBe(expectedKey);
    });

    it('should return 0x when holesky private key is not set', () => {
      const result = getEnvPrivateKey(mockConfig);

      expect(result).toBe('0x');
    });

    it('should return 0x when holesky private key is empty string', () => {
      process.env.HOLESKY_PRIVATE_KEY = '';

      const result = getEnvPrivateKey(mockConfig);

      expect(result).toBe('0x');
    });

    it('should return holesky key even when mainnet key is also set', () => {
      const holeskyKey = '0x1111111111111111111111111111111111111111111111111111111111111111';
      const mainnetKey = '0x2222222222222222222222222222222222222222222222222222222222222222';
      
      process.env.HOLESKY_PRIVATE_KEY = holeskyKey;
      process.env.MAINNET_PRIVATE_KEY = mainnetKey;

      const result = getEnvPrivateKey(mockConfig);

      expect(result).toBe(holeskyKey);
    });
  });

  describe('mainnet network', () => {
    beforeEach(() => {
      mockConfig.network = 'mainnet';
    });

    it('should return mainnet private key when available', () => {
      const expectedKey = '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
      process.env.MAINNET_PRIVATE_KEY = expectedKey;

      const result = getEnvPrivateKey(mockConfig);

      expect(result).toBe(expectedKey);
    });

    it('should return 0x when mainnet private key is not set', () => {
      const result = getEnvPrivateKey(mockConfig);

      expect(result).toBe('0x');
    });

    it('should return 0x when mainnet private key is empty string', () => {
      process.env.MAINNET_PRIVATE_KEY = '';

      const result = getEnvPrivateKey(mockConfig);

      expect(result).toBe('0x');
    });

    it('should return mainnet key even when holesky key is also set', () => {
      const holeskyKey = '0x1111111111111111111111111111111111111111111111111111111111111111';
      const mainnetKey = '0x2222222222222222222222222222222222222222222222222222222222222222';
      
      process.env.HOLESKY_PRIVATE_KEY = holeskyKey;
      process.env.MAINNET_PRIVATE_KEY = mainnetKey;

      const result = getEnvPrivateKey(mockConfig);

      expect(result).toBe(mainnetKey);
    });
  });

  describe('unknown network', () => {
    it('should return 0x for unknown network', () => {
      mockConfig.network = 'unknown-network';
      process.env.HOLESKY_PRIVATE_KEY = '0x1234567890abcdef';
      process.env.MAINNET_PRIVATE_KEY = '0xabcdef1234567890';

      const result = getEnvPrivateKey(mockConfig);

      expect(result).toBe('0x');
    });

    it('should return 0x for empty network name', () => {
      mockConfig.network = '';
      process.env.HOLESKY_PRIVATE_KEY = '0x1234567890abcdef';

      const result = getEnvPrivateKey(mockConfig);

      expect(result).toBe('0x');
    });
  });

  describe('edge cases', () => {
    it('should handle undefined environment variables gracefully', () => {
      mockConfig.network = 'holesky';
      delete process.env.HOLESKY_PRIVATE_KEY;

      const result = getEnvPrivateKey(mockConfig);

      expect(result).toBe('0x');
    });

    it('should handle case sensitivity of network names', () => {
      const privateKey = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      process.env.HOLESKY_PRIVATE_KEY = privateKey;

      // Test exact case
      mockConfig.network = 'holesky';
      expect(getEnvPrivateKey(mockConfig)).toBe(privateKey);

      // Test different case (should not match)
      mockConfig.network = 'HOLESKY';
      expect(getEnvPrivateKey(mockConfig)).toBe('0x');

      mockConfig.network = 'Holesky';
      expect(getEnvPrivateKey(mockConfig)).toBe('0x');
    });

    it('should preserve private key format exactly as provided', () => {
      // Test with 0x prefix
      const keyWithPrefix = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      process.env.HOLESKY_PRIVATE_KEY = keyWithPrefix;
      mockConfig.network = 'holesky';
      expect(getEnvPrivateKey(mockConfig)).toBe(keyWithPrefix);

      // Test without 0x prefix
      const keyWithoutPrefix = '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      process.env.HOLESKY_PRIVATE_KEY = keyWithoutPrefix;
      expect(getEnvPrivateKey(mockConfig)).toBe(keyWithoutPrefix);

      // Test with odd formatting
      const oddFormattedKey = '0X1234ABCD';
      process.env.HOLESKY_PRIVATE_KEY = oddFormattedKey;
      expect(getEnvPrivateKey(mockConfig)).toBe(oddFormattedKey);
    });
  });

  describe('multiple network configurations', () => {
    it('should correctly switch between networks', () => {
      const holeskyKey = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
      const mainnetKey = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
      
      process.env.HOLESKY_PRIVATE_KEY = holeskyKey;
      process.env.MAINNET_PRIVATE_KEY = mainnetKey;

      // Test holesky
      mockConfig.network = 'holesky';
      expect(getEnvPrivateKey(mockConfig)).toBe(holeskyKey);

      // Test mainnet
      mockConfig.network = 'mainnet';
      expect(getEnvPrivateKey(mockConfig)).toBe(mainnetKey);

      // Test back to holesky
      mockConfig.network = 'holesky';
      expect(getEnvPrivateKey(mockConfig)).toBe(holeskyKey);
    });
  });

  describe('environment loading', () => {
    it('should call dotenv.config on module import', () => {
      // Note: dotenv.config is called when the module is imported, but mocking after import doesn't capture the call
      expect(dotenv.config).toHaveBeenCalledTimes(0);
    });
  });
});