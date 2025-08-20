import { Address, stringToHex, hexToString, WalletClient } from 'viem';
import { ABIs } from '../../../abi';
import { INetworkConfig } from '../../../types/network.type';
import { getPublicClient } from '../../viem';
import { pinJsonToIpfs } from '../../ipfs/pinToIpfs';
import { getIpfsFileSafe } from '../../ipfs/getIpfsFile';
import { getNetworkCache } from '../../cache';

export interface DelegateProfileData {
  identifier: string;
  name?: string;
  description?: string;
  website?: string;
  twitter?: string;
  discord?: string;
  email?: string;
  statement?: string;
  interests?: string[];
  [key: string]: unknown;
}

/**
 * Check if a delegate profile exists for the given address
 */
export async function checkDelegateProfileExists(
  address: Address,
  config: INetworkConfig,
): Promise<{ exists: boolean; contentUrl?: string; metadata?: unknown }> {
  try {
    const client = getPublicClient(config);
    const delegationWallAddress = config.contracts.DelegationWall;

    // Get the content URL for this delegate (returns bytes)
    const contentUrlBytes = await client.readContract({
      abi: ABIs.DelegationWall,
      address: delegationWallAddress,
      functionName: 'candidates',
      args: [address],
    });

    // Convert bytes to string
    const contentUrl = contentUrlBytes ? hexToString(contentUrlBytes as unknown as `0x${string}`) : '';

    if (!contentUrl || contentUrl === '') {
      return { exists: false };
    }

    // Try to fetch existing metadata from IPFS
    let metadata: unknown = undefined;
    if (contentUrl.startsWith('ipfs://')) {
      try {
        const ipfsHash = contentUrl.replace('ipfs://', '');
        metadata = await getIpfsFileSafe(ipfsHash);
      } catch (error) {
        console.warn(`Could not fetch existing metadata: ${error}`);
      }
    }

    return { exists: true, contentUrl, metadata };
  } catch (error) {
    console.error(`Error checking delegate profile: ${error}`);
    return { exists: false };
  }
}

/**
 * Create or update a delegate profile
 */
export async function createOrUpdateDelegateProfile(
  profileData: DelegateProfileData,
  config: INetworkConfig,
  walletClient: WalletClient,
): Promise<{ success: boolean; txHash?: string; ipfsHash?: string; error?: string }> {
  try {
    if (!walletClient.account) {
      return { success: false, error: 'No wallet account found' };
    }

    console.info('Preparing delegate profile data...');

    // Pin the profile data to IPFS
    const ipfsHash = await pinJsonToIpfs(profileData);
    const ipfsUrl = `ipfs://${ipfsHash}`;
    console.info(`Profile data pinned to IPFS: ${ipfsUrl}`);

    // Convert IPFS URL to bytes for contract
    const contentUrlBytes = stringToHex(ipfsUrl);

    console.info('Registering/updating profile on-chain...');

    // Get public client for simulation
    const publicClient = getPublicClient(config);
    const delegationWallAddress = config.contracts.DelegationWall;

    // Simulate the transaction first
    const { request } = await publicClient.simulateContract({
      account: walletClient.account,
      address: delegationWallAddress,
      abi: ABIs.DelegationWall,
      functionName: 'register',
      args: [contentUrlBytes],
    });

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
      console.info('✅ Delegate profile successfully registered/updated!');
      
      // Clear the delegates cache to ensure fresh data on next fetch
      const cache = getNetworkCache(config.network);
      const cacheKey = `delegates-${config.network}`;
      await cache.delete(cacheKey);
      console.info('📦 Cache cleared - delegate list will refresh on next view');
      
      return { success: true, txHash, ipfsHash };
    } else {
      return { success: false, error: 'Transaction failed', txHash };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Error creating/updating delegate profile: ${errorMessage}`);
    return { success: false, error: errorMessage };
  }
}

/**
 * Fetch current profile data for editing
 */
export async function fetchCurrentProfileForEdit(
  address: Address,
  config: INetworkConfig,
): Promise<DelegateProfileData | null> {
  try {
    const profileInfo = await checkDelegateProfileExists(address, config);

    if (!profileInfo.exists || !profileInfo.metadata) {
      return null;
    }

    // Return the metadata as DelegateProfileData
    return profileInfo.metadata as DelegateProfileData;
  } catch (error) {
    console.error(`Error fetching current profile: ${error}`);
    return null;
  }
}

