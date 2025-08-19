import { decodeAbiParameters, keccak256 } from 'viem';
import sodium from 'libsodium-wrappers';
// export type { KeyPair } from 'libsodium-wrappers';
import { EncryptedProposalMetadata, ProposalMetadata, RawActionListAbi } from '../../../types/proposal.type';
import { decryptProposal, decryptSymmetricKey } from '../../encryption';
import { privateKeyToAccount } from 'viem/accounts';
import getEnvPrivateKey from '../../web3/getEnvPrivateKey';
import { INetworkConfig } from '../../../types/network.type';

export function hexToUint8Array(data: `0x${string}`): Uint8Array {
  const result: number[] = [];
  if (data.length % 2 != 0) throw new Error('Received an hex value with odd length');
  const hex = data.startsWith('0x') ? data.slice(2) : data;

  for (let i = 0; i < hex.length; i += 2) {
    let byte = parseInt(hex[i], 16) * 16;
    byte += parseInt(hex[i + 1], 16);
    result.push(byte);
  }
  return new Uint8Array(result);
}

export function computePublicKey(secretKey: Uint8Array) {
  return sodium.crypto_scalarmult_base(secretKey);
}

export const DETERMINISTIC_EMERGENCY_PAYLOAD =
  'This text is used to generate an encryption key to be used on private proposals targetting the Taiko DAO.\n\nSign this message ONLY if you are about to create, approve or execute a emergency proposal using the official Taiko app.';

export default async function getDecryptionKey(
  config: INetworkConfig,
): Promise<{ privateKey: Uint8Array; publicKey: Uint8Array }> {
  try {
    // Get the wallet address for signing
    const account = privateKeyToAccount(getEnvPrivateKey(config));
    const { address } = account;

    if (!address) {
      throw new Error('No wallet address available');
    }

    // Create the hash for logging/debugging (matching your original logic)
    // const hash = keccak256(toHex(DETERMINISTIC_EMERGENCY_PAYLOAD));
    // const renderHash = Array.from({ length: 4 }, (_, i) =>
    //   hash.slice(i * Math.floor(hash.length / 4), (i + 1) * Math.floor(hash.length / 4)),
    // ).join(' ');

    // Sign the deterministic message
    const privateSignature = await account.signMessage({
      message: DETERMINISTIC_EMERGENCY_PAYLOAD,
    });

    // Derive the private key from the signature
    const derivedPrivateKey = keccak256(privateSignature);
    // Compute the public key from the derived private key
    const publicKey = computePublicKey(hexToUint8Array(derivedPrivateKey));
    return {
      privateKey: hexToUint8Array(derivedPrivateKey),
      publicKey,
    };
  } catch (error) {
    const err = error as Error;

    if (err.message.includes('User rejected') || err.message.includes('denied')) {
      console.error('User canceled the signature');
      throw new Error('Signature canceled by user');
    }

    console.error('Failed to retrieve signature:', err.message);
    throw new Error('Could not retrieve signature');
  }
}

export async function decrypt(config: INetworkConfig, encryptedMetadata: EncryptedProposalMetadata) {
  const { privateKey, publicKey } = await getDecryptionKey(config);
  const pubKeys = encryptedMetadata.encrypted.symmetricKeys.map((pk) => hexToUint8Array(pk));
  try {
    const proposalSymKey = decryptSymmetricKey(pubKeys, { privateKey, publicKey });
    const result = decryptProposal(
      {
        metadata: encryptedMetadata.encrypted.metadata,
        actions: encryptedMetadata.encrypted.actions,
      },
      proposalSymKey,
    );
    const privateRawActions = result.rawActions;
    // const privateRawMetadata = result.rawMetadata;
    const privateMetadata = result.metadata as ProposalMetadata;
    const decoded = decodeAbiParameters(RawActionListAbi, privateRawActions);
    if (!decoded[0]) throw new Error("The actions parameter can't be recovered");

    // const privateActions = decoded[0];

    return privateMetadata;
  } catch (err) {
    console.error('Decryption failed:', err);
  }
}

export async function decryptProposalForExecution(
  config: INetworkConfig,
  encryptedMetadata: EncryptedProposalMetadata,
) {
  const { privateKey, publicKey } = await getDecryptionKey(config);
  const pubKeys = encryptedMetadata.encrypted.symmetricKeys.map((pk) => hexToUint8Array(pk));
  try {
    const proposalSymKey = decryptSymmetricKey(pubKeys, { privateKey, publicKey });
    const result = decryptProposal(
      {
        metadata: encryptedMetadata.encrypted.metadata,
        actions: encryptedMetadata.encrypted.actions,
      },
      proposalSymKey,
    );
    const privateRawActions = result.rawActions;
    const privateRawMetadata = result.rawMetadata;
    const privateMetadata = result.metadata as ProposalMetadata;
    const decoded = decodeAbiParameters(RawActionListAbi, privateRawActions);
    if (!decoded[0]) throw new Error("The actions parameter can't be recovered");

    const privateActions = decoded[0];

    return {
      metadata: privateMetadata,
      actions: privateActions,
      rawMetadata: privateRawMetadata,
      rawActions: privateRawActions,
    };
  } catch (err) {
    console.error('Decryption failed:', err);
    throw err;
  }
}
