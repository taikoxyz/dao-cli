import { Address } from 'viem';
import {
  getCurrentDelegation,
  delegateVotingPower,
  selfDelegate,
  hasDelegatedVotingPower,
} from '../../../../src/api/dao/delegates/delegateVotingPower';
import { getPublicClient } from '../../../../src/api/viem';
import { getNetworkCache } from '../../../../src/api/cache';

// Mock dependencies
jest.mock('../../../../src/api/viem');
jest.mock('../../../../src/api/cache');

describe('delegateVotingPower', () => {
  const mockConfig = {
    network: 'testnet',
    contracts: {
      VotingToken: '0x1234567890123456789012345678901234567890' as Address,
    },
  } as any;

  const mockAddress = '0xabcdef1234567890abcdef1234567890abcdef12' as Address;
  const mockDelegatee = '0x9876543210987654321098765432109876543210' as Address;

  const mockWalletClient = {
    account: { address: mockAddress },
    writeContract: jest.fn(),
  } as any;

  const mockPublicClient = {
    readContract: jest.fn(),
    simulateContract: jest.fn(),
    waitForTransactionReceipt: jest.fn(),
  };

  const mockCache = {
    delete: jest.fn().mockResolvedValue(true),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getPublicClient as jest.Mock).mockReturnValue(mockPublicClient);
    (getNetworkCache as jest.Mock).mockReturnValue(mockCache);
  });

  describe('getCurrentDelegation', () => {
    it('should return current delegation info', async () => {
      mockPublicClient.readContract
        .mockResolvedValueOnce(mockDelegatee) // delegates
        .mockResolvedValueOnce(1000000000000000000n) // getVotes
        .mockResolvedValueOnce(500000000000000000n); // balanceOf

      const result = await getCurrentDelegation(mockAddress, mockConfig);

      expect(result.currentDelegate).toBe(mockDelegatee);
      expect(result.votingPower).toBe(1000000000000000000n);
      expect(result.tokenBalance).toBe(500000000000000000n);

      expect(mockPublicClient.readContract).toHaveBeenCalledTimes(3);
    });

    it('should return null for zero address delegate', async () => {
      mockPublicClient.readContract
        .mockResolvedValueOnce('0x0000000000000000000000000000000000000000') // delegates
        .mockResolvedValueOnce(0n) // getVotes
        .mockResolvedValueOnce(1000000000000000000n); // balanceOf

      const result = await getCurrentDelegation(mockAddress, mockConfig);

      expect(result.currentDelegate).toBeNull();
      expect(result.votingPower).toBe(0n);
      expect(result.tokenBalance).toBe(1000000000000000000n);
    });

    it('should handle errors gracefully', async () => {
      mockPublicClient.readContract.mockRejectedValue(new Error('Contract error'));

      const result = await getCurrentDelegation(mockAddress, mockConfig);

      expect(result.currentDelegate).toBeNull();
      expect(result.votingPower).toBe(0n);
      expect(result.tokenBalance).toBe(0n);
    });
  });

  describe('delegateVotingPower', () => {
    it('should successfully delegate voting power', async () => {
      const mockTxHash = '0xtransactionhash123';

      // Mock getCurrentDelegation
      mockPublicClient.readContract
        .mockResolvedValueOnce('0x0000000000000000000000000000000000000000') // delegates
        .mockResolvedValueOnce(0n) // getVotes
        .mockResolvedValueOnce(1000000000000000000n) // balanceOf
        .mockResolvedValueOnce(2000000000000000000n); // updated delegatee voting power

      mockPublicClient.simulateContract.mockResolvedValue({
        request: { functionName: 'delegate', args: [mockDelegatee] },
      });

      mockWalletClient.writeContract.mockResolvedValue(mockTxHash);
      mockPublicClient.waitForTransactionReceipt.mockResolvedValue({
        status: 'success',
      });

      const result = await delegateVotingPower(mockDelegatee, mockConfig, mockWalletClient);

      expect(result.success).toBe(true);
      expect(result.txHash).toBe(mockTxHash);
      expect(result.error).toBeUndefined();

      expect(mockWalletClient.writeContract).toHaveBeenCalled();
      expect(mockCache.delete).toHaveBeenCalledWith('delegates-testnet');
    });

    it('should fail if no tokens to delegate', async () => {
      mockPublicClient.readContract
        .mockResolvedValueOnce('0x0000000000000000000000000000000000000000') // delegates
        .mockResolvedValueOnce(0n) // getVotes
        .mockResolvedValueOnce(0n); // balanceOf - no tokens

      const result = await delegateVotingPower(mockDelegatee, mockConfig, mockWalletClient);

      expect(result.success).toBe(false);
      expect(result.error).toContain('no voting tokens to delegate');
      expect(mockWalletClient.writeContract).not.toHaveBeenCalled();
    });

    it('should fail if already delegating to same address', async () => {
      mockPublicClient.readContract
        .mockResolvedValueOnce(mockDelegatee) // already delegating to this address
        .mockResolvedValueOnce(1000000000000000000n) // getVotes
        .mockResolvedValueOnce(1000000000000000000n); // balanceOf

      const result = await delegateVotingPower(mockDelegatee, mockConfig, mockWalletClient);

      expect(result.success).toBe(false);
      expect(result.error).toContain('already delegating to');
      expect(mockWalletClient.writeContract).not.toHaveBeenCalled();
    });

    it('should handle missing wallet account', async () => {
      const invalidWalletClient = { account: undefined } as any;

      const result = await delegateVotingPower(mockDelegatee, mockConfig, invalidWalletClient);

      expect(result.success).toBe(false);
      expect(result.error).toBe('No wallet account found');
    });

    it('should handle transaction failure', async () => {
      const mockTxHash = '0xtransactionhash123';

      mockPublicClient.readContract
        .mockResolvedValueOnce('0x0000000000000000000000000000000000000000')
        .mockResolvedValueOnce(0n)
        .mockResolvedValueOnce(1000000000000000000n);

      mockPublicClient.simulateContract.mockResolvedValue({
        request: { functionName: 'delegate', args: [mockDelegatee] },
      });

      mockWalletClient.writeContract.mockResolvedValue(mockTxHash);
      mockPublicClient.waitForTransactionReceipt.mockResolvedValue({
        status: 'reverted',
      });

      const result = await delegateVotingPower(mockDelegatee, mockConfig, mockWalletClient);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Transaction failed');
      expect(result.txHash).toBe(mockTxHash);
    });
  });

  describe('selfDelegate', () => {
    it('should delegate to own address', async () => {
      const mockTxHash = '0xtransactionhash123';

      mockPublicClient.readContract
        .mockResolvedValueOnce('0x0000000000000000000000000000000000000000')
        .mockResolvedValueOnce(0n)
        .mockResolvedValueOnce(1000000000000000000n)
        .mockResolvedValueOnce(1000000000000000000n); // self voting power after delegation

      mockPublicClient.simulateContract.mockResolvedValue({
        request: { functionName: 'delegate', args: [mockAddress] },
      });

      mockWalletClient.writeContract.mockResolvedValue(mockTxHash);
      mockPublicClient.waitForTransactionReceipt.mockResolvedValue({
        status: 'success',
      });

      const result = await selfDelegate(mockConfig, mockWalletClient);

      expect(result.success).toBe(true);
      expect(result.txHash).toBe(mockTxHash);

      // Verify it called delegate with own address
      expect(mockPublicClient.simulateContract).toHaveBeenCalledWith(
        expect.objectContaining({
          functionName: 'delegate',
          args: [mockAddress],
        }),
      );
    });

    it('should handle missing wallet account', async () => {
      const invalidWalletClient = { account: undefined } as any;

      const result = await selfDelegate(mockConfig, invalidWalletClient);

      expect(result.success).toBe(false);
      expect(result.error).toBe('No wallet account found');
    });
  });

  describe('hasDelegatedVotingPower', () => {
    it('should return true if address has voting power', async () => {
      mockPublicClient.readContract.mockResolvedValue(1000000000000000000n);

      const result = await hasDelegatedVotingPower(mockAddress, mockConfig);

      expect(result).toBe(true);
      expect(mockPublicClient.readContract).toHaveBeenCalledWith({
        abi: expect.any(Array),
        address: mockConfig.contracts.VotingToken,
        functionName: 'getVotes',
        args: [mockAddress],
      });
    });

    it('should return false if address has no voting power', async () => {
      mockPublicClient.readContract.mockResolvedValue(0n);

      const result = await hasDelegatedVotingPower(mockAddress, mockConfig);

      expect(result).toBe(false);
    });

    it('should handle errors and return false', async () => {
      mockPublicClient.readContract.mockRejectedValue(new Error('Contract error'));

      const result = await hasDelegatedVotingPower(mockAddress, mockConfig);

      expect(result).toBe(false);
    });
  });
});
