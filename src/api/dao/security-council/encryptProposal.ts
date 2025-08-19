import { Address, encodeAbiParameters, parseAbiParameters, toHex, keccak256 } from 'viem';
import { INetworkConfig } from '../../../types/network.type';
import { ABIs } from '../../../abi';
import { ProposalAction } from './createProposal';
import { encryptProposal, encryptSymmetricKey } from '../../encryption';
import { getPublicClient } from '../../viem';
import getSecurityCouncilMembers from './getSecurityCouncilMembers';
import { hexToUint8Array } from './getDecryptionKey';
import { pinJsonToIpfs } from '../../ipfs/pinToIpfs';

export interface EncryptedProposalData {
  encryptedPayloadURI: string;
  publicMetadataUriHash: `0x${string}`;
  destinationActionsHash: `0x${string}`;
}

/**
 * Fetches the public key for a Security Council member from the EncryptionRegistry
 */
async function getPublicKeyForMember(
  address: Address,
  config: INetworkConfig
): Promise<`0x${string}` | null> {
  try {
    const client = getPublicClient(config);
    const result = await client.readContract({
      address: config.contracts.EncryptionRegistry,
      abi: ABIs.EncryptionRegistry,
      functionName: 'accounts',
      args: [address],
    });
    
    // The result is [appointedAgent, publicKey]
    const publicKey = result[1] as `0x${string}`;
    
    // Check if a public key is set (not zero)
    if (publicKey === '0x0000000000000000000000000000000000000000000000000000000000000000') {
      return null;
    }
    
    return publicKey;
  } catch (error) {
    console.error(`Failed to get public key for ${address}:`, error);
    return null;
  }
}

/**
 * Encrypts proposal data for emergency proposals
 */
export async function encryptEmergencyProposal(
  config: INetworkConfig,
  metadata: any,
  actions: ProposalAction[]
): Promise<EncryptedProposalData> {
  console.info('🔐 Encrypting emergency proposal...');
  
  // Get Security Council members
  const members = await getSecurityCouncilMembers(config);
  console.info(`Found ${members.length} Security Council members`);
  
  // Fetch public keys for all members
  const publicKeys: Uint8Array[] = [];
  const membersWithKeys: string[] = [];
  
  for (const member of members) {
    // Use the signer address to get the public key
    const publicKeyHex = await getPublicKeyForMember(member.signer, config);
    if (publicKeyHex) {
      // Convert the 32-byte public key from hex to Uint8Array
      publicKeys.push(hexToUint8Array(publicKeyHex));
      membersWithKeys.push(member.signer);
    } else {
      console.warn(`⚠️  No public key found for member ${member.signer}`);
    }
  }
  
  if (publicKeys.length === 0) {
    throw new Error('No Security Council members have registered public keys. Cannot create encrypted proposal.');
  }
  
  console.info(`✅ Found public keys for ${publicKeys.length} members`);
  
  // Encode actions for encryption
  const actionBytes = encodeAbiParameters(
    parseAbiParameters('(address to, uint256 value, bytes data)[]'),
    [actions.map(a => ({ to: a.to, value: a.value, data: a.data }))]
  );
  
  // Encrypt the proposal
  const { encrypted, symmetricKey } = encryptProposal(
    JSON.stringify(metadata),
    hexToUint8Array(actionBytes)
  );
  
  // Encrypt the symmetric key for each Security Council member
  const encryptedSymKeys = encryptSymmetricKey(symmetricKey, publicKeys);
  
  // Create the encrypted payload structure
  const encryptedPayload = {
    encrypted: {
      metadata: encrypted.metadata,
      actions: encrypted.actions,
      symmetricKeys: encryptedSymKeys.map(key => toHex(key))
    }
  };
  
  // Upload encrypted payload to IPFS
  console.info('📤 Uploading encrypted payload to IPFS...');
  const encryptedIpfsHash = await pinJsonToIpfs(encryptedPayload);
  const encryptedPayloadURI = `ipfs://${encryptedIpfsHash}`;
  console.info(`✅ Encrypted payload uploaded: ${encryptedPayloadURI}`);
  
  // Upload public metadata to IPFS (for transparency)
  console.info('📤 Uploading public metadata to IPFS...');
  const publicIpfsHash = await pinJsonToIpfs(metadata);
  const publicMetadataURI = `ipfs://${publicIpfsHash}`;
  console.info(`✅ Public metadata uploaded: ${publicMetadataURI}`);
  
  // Calculate hashes (using keccak256 which returns bytes32)
  const publicMetadataUriHash = keccak256(toHex(Buffer.from(publicMetadataURI)));
  const destinationActionsHash = keccak256(actionBytes);
  
  return {
    encryptedPayloadURI,
    publicMetadataUriHash,
    destinationActionsHash
  };
}