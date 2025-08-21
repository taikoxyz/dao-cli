import { WalletClient, PublicClient } from 'viem';
import { INetworkConfig } from '../../../types/network.type';
import { ABIs } from '../../../abi';

/**
 * Check if a user can veto a public proposal
 */
export async function canVetoProposal(
  config: INetworkConfig,
  publicClient: PublicClient,
  proposalId: number,
  voterAddress: `0x${string}`,
): Promise<boolean> {
  try {
    const canVeto = await publicClient.readContract({
      address: config.contracts.OptimisticTokenVotingPlugin,
      abi: ABIs.OptimisticTokenVotingPlugin,
      functionName: 'canVeto',
      args: [BigInt(proposalId), voterAddress],
    });

    return Boolean(canVeto);
  } catch (error) {
    console.error('Failed to check if user can veto proposal:', error);
    throw error;
  }
}

/**
 * Check if a user has already vetoed a public proposal
 */
export async function hasVetoedProposal(
  config: INetworkConfig,
  publicClient: PublicClient,
  proposalId: number,
  voterAddress: `0x${string}`,
): Promise<boolean> {
  try {
    const hasVetoed = await publicClient.readContract({
      address: config.contracts.OptimisticTokenVotingPlugin,
      abi: ABIs.OptimisticTokenVotingPlugin,
      functionName: 'hasVetoed',
      args: [BigInt(proposalId), voterAddress],
    });

    return Boolean(hasVetoed);
  } catch (error) {
    console.error('Failed to check if user has vetoed proposal:', error);
    throw error;
  }
}

/**
 * Check if the minimum veto ratio has been reached for a proposal
 */
export async function isMinVetoRatioReached(
  config: INetworkConfig,
  publicClient: PublicClient,
  proposalId: number,
): Promise<boolean> {
  try {
    const isReached = await publicClient.readContract({
      address: config.contracts.OptimisticTokenVotingPlugin,
      abi: ABIs.OptimisticTokenVotingPlugin,
      functionName: 'isMinVetoRatioReached',
      args: [BigInt(proposalId)],
    });

    return Boolean(isReached);
  } catch (error) {
    console.error('Failed to check if min veto ratio is reached:', error);
    throw error;
  }
}

/**
 * Get the minimum veto ratio required
 */
export async function getMinVetoRatio(config: INetworkConfig, publicClient: PublicClient): Promise<number> {
  try {
    const minRatio = await publicClient.readContract({
      address: config.contracts.OptimisticTokenVotingPlugin,
      abi: ABIs.OptimisticTokenVotingPlugin,
      functionName: 'minVetoRatio',
      args: [],
    });

    return Number(minRatio);
  } catch (error) {
    console.error('Failed to get min veto ratio:', error);
    throw error;
  }
}

/**
 * Veto a public proposal
 */
export async function vetoProposal(
  config: INetworkConfig,
  walletClient: WalletClient,
  publicClient: PublicClient,
  proposalId: number,
): Promise<string> {
  try {
    const voterAddress = walletClient.account?.address as `0x${string}`;

    // Check if user can veto
    const canVeto = await canVetoProposal(config, publicClient, proposalId, voterAddress);
    if (!canVeto) {
      throw new Error('You cannot veto this proposal (may have already vetoed or proposal not in veto period)');
    }

    // Check if already vetoed
    const hasVetoed = await hasVetoedProposal(config, publicClient, proposalId, voterAddress);
    if (hasVetoed) {
      throw new Error('You have already vetoed this proposal');
    }

    console.info(`Vetoing public proposal ${proposalId}...`);

    const simulation = await publicClient.simulateContract({
      address: config.contracts.OptimisticTokenVotingPlugin,
      abi: ABIs.OptimisticTokenVotingPlugin,
      functionName: 'veto',
      args: [BigInt(proposalId)],
      account: walletClient.account,
    });

    const hash = await walletClient.writeContract(simulation.request);

    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    if (receipt.status === 'success') {
      console.info(`Successfully vetoed public proposal ${proposalId}`);

      // Check if veto threshold is reached
      const isVetoReached = await isMinVetoRatioReached(config, publicClient, proposalId);
      if (isVetoReached) {
        console.info('⚠️  The minimum veto ratio has been reached - this proposal will not execute');
      }

      return hash;
    } else {
      throw new Error('Transaction failed');
    }
  } catch (error) {
    console.error('Failed to veto public proposal:', error);
    throw error;
  }
}

export default vetoProposal;
