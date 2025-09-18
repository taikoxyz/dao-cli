import { Address, hexToString } from 'viem';
import { ABIs } from '../../../abi';
import { INetworkConfig } from '../../../types/network.type';
import { getPublicClient } from '../../viem';
import { getIpfsFileSafe, isNotFoundMarker } from '../../ipfs/getIpfsFile';
import { EncryptedProposalMetadata } from '../../../types/proposal.type';
import { decrypt } from '../security-council/getDecryptionKey';

export default async function getEmergencyProposal(proposalId: number, config: INetworkConfig) {
  try {
    const client = getPublicClient(config);
    const res = await client.readContract({
      abi: ABIs.EmergencyMultisigPlugin,
      address: config.contracts.EmergencyMultisigPlugin,
      functionName: 'getProposal',
      args: [proposalId],
    });

    // res[3] is the encryptedPayloadUri for emergency proposals
    const encryptedPayloadURI = res[3] as Address;

    const ipfsUri = hexToString(encryptedPayloadURI);
    const rawUri = ipfsUri.startsWith('ipfs://') ? ipfsUri.slice(7) : ipfsUri;

    // Fetch the encrypted payload from IPFS
    const encryptedPayload = await getIpfsFileSafe<EncryptedProposalMetadata>(rawUri);

    let decryptedMetadata = null;
    if (isNotFoundMarker(encryptedPayload)) {
      console.warn(`Encrypted payload not found for emergency proposal ${proposalId}, IPFS hash: ${rawUri}`);
      decryptedMetadata = {
        title: `[NOT FOUND]:${rawUri}`,
        summary: `Encrypted payload not available for IPFS hash: ${rawUri}`,
        description: `The encrypted proposal payload could not be retrieved from IPFS. Hash: ${rawUri}`,
      };
    } else if (encryptedPayload) {
      try {
        // Try to decrypt the proposal
        console.info('Attempting to decrypt emergency proposal...');
        decryptedMetadata = await decrypt(config, encryptedPayload);
        if (decryptedMetadata) {
          console.info('Successfully decrypted emergency proposal');
        }
      } catch {
        console.warn('Could not decrypt emergency proposal (you may not be a Security Council member)');
      }
    } else {
      console.warn(`Could not fetch encrypted payload for emergency proposal ${proposalId}`);
    }

    return {
      executed: res[0],
      approvals: res[1],
      parameters: res[2],
      encryptedPayloadURI: ipfsUri,
      publicMetadataUriHash: res[4],
      destinationActionsHash: res[5],
      destinationPlugin: res[6] as Address,
      proposalId,
      ...(decryptedMetadata || {
        title: '[Encrypted]',
        summary: 'This proposal is encrypted for Security Council members',
        description: 'You must be a Security Council member to view this proposal',
      }),
    };
  } catch (e) {
    console.error(`Error fetching emergency proposal ${proposalId}:`, e);
    console.error(e);
  }
}
