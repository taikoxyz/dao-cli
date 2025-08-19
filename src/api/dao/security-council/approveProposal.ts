import { WalletClient, PublicClient } from 'viem';
import { INetworkConfig } from '../../../types/network.type';
import { ABIs } from '../../../abi';

/**
 * Approve a standard proposal
 */
export async function approveStandardProposal(
  config: INetworkConfig,
  walletClient: WalletClient,
  publicClient: PublicClient,
  proposalId: number,
): Promise<string> {
  try {
    console.info(`Approving standard proposal ${proposalId}...`);

    const multisigAddress = config.contracts.MultisigPlugin;

    const simulation = await publicClient.simulateContract({
      address: multisigAddress,
      abi: ABIs.MultisigPlugin,
      functionName: 'approve',
      args: [proposalId, false], // Never auto-execute
      account: walletClient.account,
    });

    const hash = await walletClient.writeContract(simulation.request);

    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    if (receipt.status === 'success') {
      console.info(`Successfully approved standard proposal ${proposalId}`);
      return hash;
    } else {
      throw new Error('Transaction failed');
    }
  } catch (error) {
    console.error('Failed to approve standard proposal:', error);
    throw error;
  }
}

/**
 * Approve an emergency proposal
 */
export async function approveEmergencyProposal(
  config: INetworkConfig,
  walletClient: WalletClient,
  publicClient: PublicClient,
  proposalId: number,
): Promise<string> {
  try {
    console.info(`Approving emergency proposal ${proposalId}...`);

    const multisigAddress = config.contracts.EmergencyMultisigPlugin;

    const simulation = await publicClient.simulateContract({
      address: multisigAddress,
      abi: ABIs.EmergencyMultisigPlugin,
      functionName: 'approve',
      args: [proposalId],
      account: walletClient.account,
    });

    const hash = await walletClient.writeContract(simulation.request);

    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    if (receipt.status === 'success') {
      console.info(`Successfully approved emergency proposal ${proposalId}`);
      return hash;
    } else {
      throw new Error('Transaction failed');
    }
  } catch (error) {
    console.error('Failed to approve emergency proposal:', error);
    throw error;
  }
}
