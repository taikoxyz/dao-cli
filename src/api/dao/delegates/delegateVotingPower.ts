import { Address, parseAbi, WalletClient } from 'viem';
import { INetworkConfig } from '../../../types/network.type';
import { getPublicClient } from '../../viem';
import { getNetworkCache } from '../../cache';

// ERC20Votes ABI for delegation
const ERC20VotesABI = parseAbi([
  'function delegate(address delegatee) public',
  'function delegates(address account) view returns (address)',
  'function getVotes(address account) view returns (uint256)',
  'function balanceOf(address account) view returns (uint256)',
  'function getPastVotes(address account, uint256 blockNumber) view returns (uint256)',
]);

export interface DelegationInfo {
  currentDelegate: Address | null;
  votingPower: bigint;
  tokenBalance: bigint;
}

/**
 * Get current delegation info for an address
 */
export async function getCurrentDelegation(address: Address, config: INetworkConfig): Promise<DelegationInfo> {
  try {
    const client = getPublicClient(config);
    const votingTokenAddress = config.contracts.VotingToken;

    // Get current delegate
    const currentDelegate = (await client.readContract({
      abi: ERC20VotesABI,
      address: votingTokenAddress,
      functionName: 'delegates',
      args: [address],
    })) as Address;

    // Get voting power
    const votingPower = (await client.readContract({
      abi: ERC20VotesABI,
      address: votingTokenAddress,
      functionName: 'getVotes',
      args: [address],
    })) as bigint;

    // Get token balance
    const tokenBalance = (await client.readContract({
      abi: ERC20VotesABI,
      address: votingTokenAddress,
      functionName: 'balanceOf',
      args: [address],
    })) as bigint;

    return {
      currentDelegate: currentDelegate === '0x0000000000000000000000000000000000000000' ? null : currentDelegate,
      votingPower,
      tokenBalance,
    };
  } catch (error) {
    console.error(`Error fetching delegation info for ${address}:`, error);
    return {
      currentDelegate: null,
      votingPower: 0n,
      tokenBalance: 0n,
    };
  }
}

/**
 * Delegate voting power to another address
 */
export async function delegateVotingPower(
  delegatee: Address,
  config: INetworkConfig,
  walletClient: WalletClient,
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    if (!walletClient.account) {
      return { success: false, error: 'No wallet account found' };
    }

    const delegator = walletClient.account.address;
    console.info(`\n🗳️ Delegating voting power from ${delegator} to ${delegatee}...`);

    // Get public client for simulation
    const publicClient = getPublicClient(config);
    const votingTokenAddress = config.contracts.VotingToken;

    // Check current delegation first
    const currentInfo = await getCurrentDelegation(delegator, config);

    if (currentInfo.tokenBalance === 0n) {
      return {
        success: false,
        error: 'You have no voting tokens to delegate. You need to hold tokens to delegate voting power.',
      };
    }

    if (currentInfo.currentDelegate === delegatee) {
      return {
        success: false,
        error: `You are already delegating to ${delegatee}`,
      };
    }

    console.info('Simulating delegation transaction...');

    // Simulate the transaction first
    const { request } = await publicClient.simulateContract({
      account: walletClient.account,
      address: votingTokenAddress,
      abi: ERC20VotesABI,
      functionName: 'delegate',
      args: [delegatee],
    });

    console.info('Executing delegation transaction...');

    // Execute the transaction
    const txHash = await walletClient.writeContract(request);

    console.info(`Transaction submitted: ${txHash}`);
    console.info('Waiting for confirmation...');

    // Wait for transaction confirmation
    const receipt = await publicClient.waitForTransactionReceipt({
      hash: txHash,
      confirmations: 1,
    });

    if (receipt.status === 'success') {
      console.info('✅ Delegation successful!');

      // Clear the delegates cache to ensure fresh data
      const cache = getNetworkCache(config.network);
      const cacheKey = `delegates-${config.network}`;
      await cache.delete(cacheKey);

      // Get updated voting power for the delegatee
      const updatedDelegatePower = (await publicClient.readContract({
        abi: ERC20VotesABI,
        address: votingTokenAddress,
        functionName: 'getVotes',
        args: [delegatee],
      })) as bigint;

      console.info(`\n📊 Delegation Summary:`);
      console.info(`  From: ${delegator}`);
      console.info(`  To: ${delegatee}`);
      console.info(`  Your token balance: ${(Number(currentInfo.tokenBalance) / 1e18).toFixed(4)} tokens`);
      console.info(`  Delegatee's new voting power: ${(Number(updatedDelegatePower) / 1e18).toFixed(4)} votes`);

      return { success: true, txHash };
    } else {
      return { success: false, error: 'Transaction failed', txHash };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Error delegating voting power: ${errorMessage}`);
    return { success: false, error: errorMessage };
  }
}

/**
 * Self-delegate (delegate to your own address)
 */
export async function selfDelegate(
  config: INetworkConfig,
  walletClient: WalletClient,
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  if (!walletClient.account) {
    return { success: false, error: 'No wallet account found' };
  }

  console.info('\n🔄 Self-delegating to activate your voting power...');
  return delegateVotingPower(walletClient.account.address, config, walletClient);
}

/**
 * Check if an address has any delegated voting power
 */
export async function hasDelegatedVotingPower(address: Address, config: INetworkConfig): Promise<boolean> {
  try {
    const client = getPublicClient(config);
    const votingTokenAddress = config.contracts.VotingToken;

    const votingPower = (await client.readContract({
      abi: ERC20VotesABI,
      address: votingTokenAddress,
      functionName: 'getVotes',
      args: [address],
    })) as bigint;

    return votingPower > 0n;
  } catch (error) {
    console.error(`Error checking voting power for ${address}:`, error);
    return false;
  }
}
