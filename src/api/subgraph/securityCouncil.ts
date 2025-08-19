import { INetworkConfig } from '../../types/network.type';
import { Address } from 'viem';
import { getNetworkCache } from '../cache';

interface GraphQLResponse<T = unknown> {
  data?: T;
  errors?: Array<{ message: string }>;
}

interface Approver {
  id: string;
}

interface ProposalMixin {
  id: string;
  approvers: Approver[];
}

interface SignerListData {
  signerListMembers: ProposalMixin[];
}

interface ProposalMixinsData {
  proposalMixins: Array<{ id: string }>;
}

export async function getSecurityCouncilMembersFromSubgraph(
  config: INetworkConfig,
): Promise<{ owner: Address; signer: Address }[]> {
  const cache = getNetworkCache(config.network);
  const inCache = await cache.has('signerList');
  if (inCache) {
    console.info(`Using cached signer list for ${config.network}`);
    return (await cache.get('signerList')) as { owner: Address; signer: Address }[];
  }

  // Query to get signer list members
  const query = `
        query GetSignerListMembers {
            signerListMembers: proposalMixins(
                where: { approvers_: {} }
                first: 1000
            ) {
                approvers {
                    id
                }
            }
        }
    `;

  try {
    const SUBGRAPH_ENDPOINT = config.subgraph;
    if (!SUBGRAPH_ENDPOINT) {
      throw new Error('Subgraph endpoint is not defined in network config');
    }

    const response = await fetch(SUBGRAPH_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      throw new Error(`Subgraph request failed: ${response.status} ${response.statusText}`);
    }

    const result = (await response.json()) as GraphQLResponse<SignerListData>;

    if (result.errors) {
      console.error('GraphQL errors:', result.errors);
      return [];
    }

    // Extract unique approvers
    const approversSet = new Set<string>();
    const mixins = result.data?.signerListMembers || [];

    mixins.forEach((mixin: ProposalMixin) => {
      if (mixin.approvers) {
        mixin.approvers.forEach((approver: Approver) => {
          approversSet.add(approver.id);
        });
      }
    });

    // Convert to the expected format
    const members = Array.from(approversSet).map((address) => ({
      owner: address as Address,
      signer: address as Address,
    }));

    if (members.length > 0) {
      await cache.set('signerList', members);
    }

    console.info(`Found ${members.length} security council members from subgraph`);
    return members;
  } catch (error) {
    console.error('Error fetching security council members from subgraph:', error);
    return [];
  }
}

export async function isAppointedAgentFromSubgraph(address: Address, config: INetworkConfig): Promise<boolean> {
  const query = `
        query IsAppointedAgent($address: String!) {
            proposalMixins(
                where: { approvers_: { id: $address } }
                first: 1
            ) {
                id
            }
        }
    `;

  try {
    const SUBGRAPH_ENDPOINT = config.subgraph;
    if (!SUBGRAPH_ENDPOINT) {
      throw new Error('Subgraph endpoint is not defined in network config');
    }

    const response = await fetch(SUBGRAPH_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables: {
          address: address.toLowerCase(),
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Subgraph request failed: ${response.status} ${response.statusText}`);
    }

    const result = (await response.json()) as GraphQLResponse<ProposalMixinsData>;

    if (result.errors) {
      console.error('GraphQL errors:', result.errors);
      return false;
    }

    const mixins = result.data?.proposalMixins || [];
    return mixins.length > 0;
  } catch (error) {
    console.error('Error checking if address is appointed agent:', error);
    return false;
  }
}

export async function getDecryptionKeyFromSubgraph(): Promise<string | null> {
  // Note: Decryption keys are typically not stored in the subgraph
  // This would need to be handled differently, possibly through IPFS or
  // a separate service for key management
  console.warn('Decryption keys are not available through the subgraph');
  return null;
}
