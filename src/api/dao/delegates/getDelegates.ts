import { Address, hexToString, parseAbi } from 'viem';
import { ABIs } from '../../../abi';
import { INetworkConfig } from '../../../types/network.type';
import { getPublicClient } from '../../viem';
import { getIpfsFileSafe, isNotFoundMarker, extractHashFromNotFoundMarker } from '../../ipfs/getIpfsFile';
import { getNetworkCache } from '../../cache';

// ERC20Votes ABI for voting power
const ERC20VotesABI = parseAbi([
  'function balanceOf(address account) view returns (uint256)',
  'function getVotes(address account) view returns (uint256)',
  'function delegates(address account) view returns (address)',
  'function totalSupply() view returns (uint256)',
]);

export interface DelegateProfile {
  address: Address;
  contentUrl: string;
  metadata?: unknown;
  votingPower?: bigint;
  tokenBalance?: bigint;
  identifier?: string;
}

/**
 * Fetches all delegate profiles from the DelegationWall contract
 */
export default async function getDelegates(config: INetworkConfig): Promise<DelegateProfile[]> {
  try {
    // Check cache first - but invalidate if metadata is missing
    const cache = getNetworkCache(config.network);
    const cacheKey = `delegates-${config.network}`;
    const inCache = await cache.has(cacheKey);
    if (inCache) {
      const cachedDelegates = (await cache.get(cacheKey)) as DelegateProfile[];
      // Check if cached data has metadata populated
      const hasMetadata = cachedDelegates.some((d) => d.identifier !== undefined);
      if (hasMetadata) {
        console.info(`Using cached delegates list for ${config.network}`);
        return cachedDelegates;
      } else {
        console.info(`Cache found but metadata missing, refreshing...`);
      }
    }

    const client = getPublicClient(config);
    const delegationWallAddress = config.contracts.DelegationWall;

    // Get all candidate addresses
    const candidateAddresses = (await client.readContract({
      abi: ABIs.DelegationWall,
      address: delegationWallAddress,
      functionName: 'getCandidateAddresses',
      args: [],
    })) as Address[];

    console.info(`Found ${candidateAddresses.length} delegate candidates`);

    // Fetch delegate profiles for each address
    const delegates: DelegateProfile[] = [];

    for (const address of candidateAddresses) {
      try {
        // Get the content URL for this delegate (returns bytes)
        const contentUrlBytes = await client.readContract({
          abi: ABIs.DelegationWall,
          address: delegationWallAddress,
          functionName: 'candidates',
          args: [address],
        });

        // Convert bytes to string
        const contentUrl = contentUrlBytes ? hexToString(contentUrlBytes as unknown as `0x${string}`) : '';

        const profile: DelegateProfile = {
          address,
          contentUrl,
        };

        // Try to fetch metadata from IPFS if the URL is an IPFS link
        if (contentUrl && contentUrl.startsWith('ipfs://')) {
          try {
            const ipfsHash = contentUrl.replace('ipfs://', '');
            const metadata = await getIpfsFileSafe(ipfsHash);

            if (isNotFoundMarker(metadata)) {
              const missingHash = extractHashFromNotFoundMarker(metadata);
              console.warn(`Metadata not found for delegate ${profile.address}, IPFS hash: ${missingHash}`);
              profile.metadata = metadata; // Store the [NOT FOUND] marker
              profile.identifier = `[METADATA NOT FOUND]:${missingHash}`;
            } else if (!metadata) {
              console.warn(`Could not fetch metadata for delegate ${profile.address}, continuing without it`);
            } else {
              profile.metadata = metadata;
              // Extract identifier from metadata if available - check 'identifier' field first
              if (typeof metadata === 'object') {
                profile.identifier = ((metadata as Record<string, unknown>).identifier ||
                  (metadata as Record<string, unknown>).name ||
                  (metadata as Record<string, unknown>).title ||
                  (metadata as Record<string, unknown>).displayName) as string | undefined;
                if (!profile.identifier) {
                  console.warn(`No identifier found in metadata for ${address}`);
                }
              }
            }
          } catch (error) {
            console.error(`Error fetching IPFS metadata for delegate ${address}:`, error);
          }
        }

        delegates.push(profile);
      } catch (error) {
        console.error(`Error fetching profile for delegate ${address}:`, error);
      }
    }

    // Cache the results
    await cache.set(cacheKey, delegates);

    return delegates;
  } catch (error) {
    console.error('Error fetching delegates:', error);
    return [];
  }
}

/**
 * Fetches a single delegate profile with voting power
 */
export async function getDelegate(
  address: Address,
  config: INetworkConfig,
  includeVotingPower: boolean = false,
): Promise<DelegateProfile | null> {
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

    if (!contentUrl) {
      return null;
    }

    const profile: DelegateProfile = {
      address,
      contentUrl,
    };

    // Try to fetch metadata from IPFS if the URL is an IPFS link
    if (contentUrl.startsWith('ipfs://')) {
      try {
        const ipfsHash = contentUrl.replace('ipfs://', '');
        const metadata = await getIpfsFileSafe(ipfsHash);

        if (isNotFoundMarker(metadata)) {
          const missingHash = extractHashFromNotFoundMarker(metadata);
          console.warn(`Metadata not found for delegate ${address}, IPFS hash: ${missingHash}`);
          profile.metadata = metadata; // Store the [NOT FOUND] marker
          profile.identifier = `[METADATA NOT FOUND]:${missingHash}`;
        } else if (!metadata) {
          console.warn(`Could not fetch metadata for delegate ${address}, continuing without it`);
        } else {
          profile.metadata = metadata;
          // Extract identifier from metadata if available - check 'identifier' field first
          if (typeof metadata === 'object') {
            profile.identifier = ((metadata as Record<string, unknown>).identifier ||
              (metadata as Record<string, unknown>).name ||
              (metadata as Record<string, unknown>).title ||
              (metadata as Record<string, unknown>).displayName) as string | undefined;
          }
        }
      } catch (error) {
        console.error(`Error fetching IPFS metadata for delegate ${address}:`, error);
      }
    }

    // Fetch voting power if requested
    if (includeVotingPower) {
      const votingPower = await getDelegateVotingPower(address, config);
      profile.votingPower = votingPower.votingPower;
      profile.tokenBalance = votingPower.tokenBalance;
    }

    return profile;
  } catch (error) {
    console.error(`Error fetching delegate ${address}:`, error);
    return null;
  }
}

/**
 * Gets the voting power for a delegate
 */
export async function getDelegateVotingPower(
  address: Address,
  config: INetworkConfig,
): Promise<{ votingPower: bigint; tokenBalance: bigint }> {
  try {
    const client = getPublicClient(config);
    const votingTokenAddress = config.contracts.VotingToken;

    // Get voting power (delegated votes)
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

    return { votingPower, tokenBalance };
  } catch (error) {
    console.error(`Error fetching voting power for ${address}:`, error);
    return { votingPower: 0n, tokenBalance: 0n };
  }
}

/**
 * Gets the total count of registered delegates
 */
export async function getDelegateCount(config: INetworkConfig): Promise<number> {
  try {
    const client = getPublicClient(config);
    const delegationWallAddress = config.contracts.DelegationWall;

    const count = await client.readContract({
      abi: ABIs.DelegationWall,
      address: delegationWallAddress,
      functionName: 'candidateCount',
      args: [],
    });

    return Number(count);
  } catch (error) {
    console.error('Error fetching delegate count:', error);
    return 0;
  }
}
