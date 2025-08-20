import { encodeFunctionData, WalletClient, PublicClient, Address, decodeEventLog } from 'viem';
import { INetworkConfig } from '../../../types/network.type';
import { ABIs } from '../../../abi';
import { pinJsonToIpfs } from '../../ipfs/pinToIpfs';
import { encryptEmergencyProposal } from './encryptProposal';

export interface ProposalMetadata {
  title: string;
  summary: string;
  description: string;
  resources?: { name: string; url: string }[];
}

export interface ProposalAction {
  to: Address;
  value: bigint;
  data: `0x${string}`;
}

/**
 * Creates a proposal through the Multisig plugin
 */
export async function createProposal(
  config: INetworkConfig,
  walletClient: WalletClient,
  publicClient: PublicClient,
  metadata: ProposalMetadata,
  actions: ProposalAction[] = [],
  destinationPlugin: Address | null = null,
  approveProposal: boolean = true,
  proposalType: 'standard' | 'emergency' = 'standard',
): Promise<string> {
  try {
    // Upload metadata to IPFS
    console.info('📤 Uploading proposal metadata to IPFS...');
    const ipfsHash = await pinJsonToIpfs(metadata);
    const metadataURI = `ipfs://${ipfsHash}`;
    console.info(`✅ Metadata uploaded to IPFS: ${metadataURI}`);

    // Convert metadata URI to bytes
    const metadataBytes = Buffer.from(metadataURI, 'utf-8');
    const metadataHex = `0x${metadataBytes.toString('hex')}` as `0x${string}`;

    let request;

    if (proposalType === 'emergency') {
      // Emergency proposals have a different contract interface
      const multisigAddress = config.contracts.EmergencyMultisigPlugin;

      // Properly encrypt the proposal for Security Council members
      const encryptedData = await encryptEmergencyProposal(config, metadata, actions);

      // Convert encrypted payload URI to bytes
      const encryptedPayloadBytes = Buffer.from(encryptedData.encryptedPayloadURI, 'utf-8');
      const encryptedPayloadHex = `0x${encryptedPayloadBytes.toString('hex')}` as `0x${string}`;

      // Emergency proposals still need a destination plugin
      const finalDestinationPlugin = destinationPlugin || config.contracts.OptimisticTokenVotingPlugin;

      const simulation = await publicClient.simulateContract({
        address: multisigAddress,
        abi: ABIs.EmergencyMultisigPlugin,
        functionName: 'createProposal',
        args: [
          encryptedPayloadHex, // _encryptedPayloadURI
          encryptedData.publicMetadataUriHash, // _publicMetadataUriHash
          encryptedData.destinationActionsHash, // _destinationActionsHash
          finalDestinationPlugin, // _destinationPlugin
          approveProposal, // _approveProposal
        ],
        account: walletClient.account,
      });
      request = simulation.request;
    } else {
      // Standard proposals use the regular multisig
      const multisigAddress = config.contracts.MultisigPlugin;
      const finalDestinationPlugin = destinationPlugin || config.contracts.OptimisticTokenVotingPlugin;

      const simulation = await publicClient.simulateContract({
        address: multisigAddress,
        abi: ABIs.MultisigPlugin,
        functionName: 'createProposal',
        args: [
          metadataHex, // _metadataURI as bytes
          actions, // _destinationActions
          finalDestinationPlugin, // _destinationPlugin
          approveProposal, // _approveProposal
        ],
        account: walletClient.account,
      });
      request = simulation.request;
    }

    // Execute the transaction
    const hash = await walletClient.writeContract(request);

    // Wait for transaction confirmation
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    if (receipt.status === 'success') {
      console.info(`✅ Proposal created successfully!`);
      console.info(`Transaction hash: ${hash}`);

      // Try to extract proposal ID from events
      const abi = proposalType === 'emergency' ? ABIs.EmergencyMultisigPlugin : ABIs.MultisigPlugin;
      const proposalCreatedEvent = receipt.logs.find((log) => {
        try {
          const decoded = decodeEventLog({
            abi,
            data: log.data,
            topics: log.topics,
          }) as { eventName: string };
          return decoded.eventName === 'ProposalCreated';
        } catch {
          return false;
        }
      });

      if (proposalCreatedEvent) {
        const decoded = decodeEventLog({
          abi,
          data: proposalCreatedEvent.data,
          topics: proposalCreatedEvent.topics,
        }) as { args?: { proposalId?: unknown } };
        console.info(`Proposal ID: ${decoded.args?.proposalId}`);
      }

      return hash;
    } else {
      throw new Error('Transaction failed');
    }
  } catch (error) {
    console.error('Failed to create proposal:', error);
    throw error;
  }
}

/**
 * Helper function to encode a contract call as an action
 */
export function encodeAction(
  contractAddress: Address,
  abi: unknown[],
  functionName: string,
  args: unknown[] = [],
  value: bigint = 0n,
): ProposalAction {
  const data = encodeFunctionData({
    abi,
    functionName,
    args,
  });

  return {
    to: contractAddress,
    value,
    data,
  };
}
