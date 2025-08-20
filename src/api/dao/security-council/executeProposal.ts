import { WalletClient, PublicClient } from 'viem';
import { INetworkConfig } from '../../../types/network.type';
import { ABIs } from '../../../abi';
import { decryptProposalForExecution } from './getDecryptionKey';
import { getIpfsFileSafe } from '../../ipfs/getIpfsFile';
import { EncryptedProposalMetadata } from '../../../types/proposal.type';
import { pinJsonToIpfs } from '../../ipfs/pinToIpfs';
import getEmergencyProposal from '../emergency-proposal/getEmergencyProposal';

/**
 * Execute a standard proposal
 */
export async function executeStandardProposal(
  config: INetworkConfig,
  walletClient: WalletClient,
  publicClient: PublicClient,
  proposalId: number,
): Promise<string> {
  try {
    console.info(`Executing standard proposal ${proposalId}...`);

    // Check if proposal can be executed
    const canExecute = await publicClient.readContract({
      address: config.contracts.MultisigPlugin,
      abi: ABIs.MultisigPlugin,
      functionName: 'canExecute',
      args: [proposalId],
    });

    if (!canExecute) {
      throw new Error('Proposal cannot be executed yet (insufficient approvals or expired)');
    }

    const multisigAddress = config.contracts.MultisigPlugin;

    const simulation = await publicClient.simulateContract({
      address: multisigAddress,
      abi: ABIs.MultisigPlugin,
      functionName: 'execute',
      args: [proposalId],
      account: walletClient.account,
    });

    const hash = await walletClient.writeContract(simulation.request);

    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    if (receipt.status === 'success') {
      console.info(`Successfully executed standard proposal ${proposalId}`);
      return hash;
    } else {
      throw new Error('Transaction failed');
    }
  } catch (error) {
    console.error('Failed to execute standard proposal:', error);
    throw error;
  }
}

/**
 * Execute an emergency proposal
 */
export async function executeEmergencyProposal(
  config: INetworkConfig,
  walletClient: WalletClient,
  publicClient: PublicClient,
  proposalId: number,
): Promise<string> {
  try {
    console.info(`Executing emergency proposal ${proposalId}...`);

    // Check if proposal can be executed
    const canExecute = await publicClient.readContract({
      address: config.contracts.EmergencyMultisigPlugin,
      abi: ABIs.EmergencyMultisigPlugin,
      functionName: 'canExecute',
      args: [proposalId],
    });

    if (!canExecute) {
      throw new Error('Proposal cannot be executed yet (insufficient approvals or expired)');
    }

    // Get the proposal to fetch the encrypted payload
    console.info('Fetching emergency proposal data...');
    const proposal = await getEmergencyProposal(proposalId, config);
    if (!proposal || !proposal.encryptedPayloadURI) {
      throw new Error('Could not fetch emergency proposal data');
    }

    // Get the encrypted payload from IPFS
    const rawUri = proposal.encryptedPayloadURI.startsWith('ipfs://')
      ? proposal.encryptedPayloadURI.slice(7)
      : proposal.encryptedPayloadURI;

    console.info('Fetching encrypted payload from IPFS...');
    const encryptedPayload = await getIpfsFileSafe<EncryptedProposalMetadata>(rawUri);
    if (!encryptedPayload) {
      throw new Error('Could not fetch encrypted payload from IPFS');
    }

    // Decrypt the proposal to get metadata and actions
    console.info('Decrypting emergency proposal...');
    const decryptedData = await decryptProposalForExecution(config, encryptedPayload);
    if (!decryptedData) {
      throw new Error('Could not decrypt emergency proposal');
    }

    // Upload the decrypted metadata to IPFS to get a public URI
    console.info('Uploading decrypted metadata to IPFS...');
    const publicMetadataHash = await pinJsonToIpfs(decryptedData.metadata);
    const publicMetadataURI = `ipfs://${publicMetadataHash}`;

    // Convert metadata URI to bytes
    const metadataBytes = Buffer.from(publicMetadataURI, 'utf-8');
    const metadataHex = `0x${metadataBytes.toString('hex')}` as `0x${string}`;

    console.info('Executing emergency proposal with decrypted data...');
    console.info(`Metadata URI: ${publicMetadataURI}`);
    console.info(`Actions count: ${decryptedData.actions.length}`);

    const multisigAddress = config.contracts.EmergencyMultisigPlugin;

    const simulation = await publicClient.simulateContract({
      address: multisigAddress,
      abi: ABIs.EmergencyMultisigPlugin,
      functionName: 'execute',
      args: [proposalId, metadataHex, decryptedData.actions],
      account: walletClient.account,
    });

    const hash = await walletClient.writeContract(simulation.request);

    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    if (receipt.status === 'success') {
      console.info(`Successfully executed emergency proposal ${proposalId}`);
      return hash;
    } else {
      throw new Error('Transaction failed');
    }
  } catch (error) {
    console.error('Failed to execute emergency proposal:', error);
    throw error;
  }
}
