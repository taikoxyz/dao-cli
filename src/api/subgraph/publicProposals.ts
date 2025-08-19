import { INetworkConfig } from '../../types/network.type';
import { IProposalMetadata } from '../../types/proposal.type';
import { getIpfsFileSafe } from '../ipfs/getIpfsFile';
import { SubgraphOptimisticProposal } from './types';
import { hexToString } from 'viem';

export async function getPublicProposalFromSubgraph(proposalId: number, config: INetworkConfig) {
  const query = `
        query GetPublicProposal($proposalId: String!) {
            optimisticTokenVotingProposals(where: { id: $proposalId }) {
                id
                creator
                metadata
                startDate
                endDate
                creatorAddress
                contractEventId
                creationBlockNumber
            }
            proposalMixins(where: { proposalId: $proposalId, isOptimistic: true }) {
                id
                proposalId
                metadata
                creator
                creationTxHash
                creationBlockNumber
                executionBlockNumber
                executionTxHash
                vetoes {
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
      body: JSON.stringify({
        query,
        variables: {
          proposalId: proposalId.toString(),
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Subgraph request failed: ${response.status} ${response.statusText}`);
    }

    const result = (await response.json()) as any;

    if (result.errors) {
      console.error('GraphQL errors:', result.errors);
      return undefined;
    }

    const proposal = result.data?.optimisticTokenVotingProposals?.[0];
    const mixin = result.data?.proposalMixins?.[0];

    if (!proposal && !mixin) {
      console.log(`Public proposal ${proposalId} not found in subgraph`);
      return undefined;
    }

    // Parse metadata from IPFS if available
    let metadata: IProposalMetadata | undefined;
    const metadataHex = proposal?.metadata || mixin?.metadata;

    if (metadataHex) {
      try {
        const ipfsUri = hexToString(metadataHex);
        const rawUri = ipfsUri.startsWith('ipfs://') ? ipfsUri.slice(7) : ipfsUri;
        metadata = await getIpfsFileSafe<IProposalMetadata>(rawUri);
        if (!metadata) {
          console.warn(`Could not fetch metadata for public proposal ${proposalId}, continuing without it`);
        }
      } catch (error) {
        console.error(`Error fetching metadata for public proposal ${proposalId}:`, error);
      }
    }

    return {
      proposalId,
      executed: mixin?.executionBlockNumber !== null,
      metadataURI: metadataHex ? hexToString(metadataHex) : '',
      creator: proposal?.creator || mixin?.creator,
      creatorAddress: proposal?.creatorAddress,
      startDate: proposal?.startDate ? new Date(parseInt(proposal.startDate) * 1000) : undefined,
      endDate: proposal?.endDate ? new Date(parseInt(proposal.endDate) * 1000) : undefined,
      creationBlockNumber: BigInt(proposal?.creationBlockNumber || mixin?.creationBlockNumber || 0),
      executionBlockNumber: mixin?.executionBlockNumber ? BigInt(mixin.executionBlockNumber) : null,
      vetoes: mixin?.vetoes || [],
      ...metadata,
    };
  } catch (error) {
    console.error(`Error fetching public proposal ${proposalId} from subgraph:`, error);
    throw error;
  }
}

export async function getPublicProposalsFromSubgraph(config: INetworkConfig) {
  const query = `
        query GetPublicProposals($first: Int!, $skip: Int!) {
            optimisticTokenVotingProposals(
                first: $first
                skip: $skip
                orderBy: creationBlockNumber
                orderDirection: desc
            ) {
                id
                creator
                metadata
                startDate
                endDate
                creatorAddress
                contractEventId
                creationBlockNumber
            }
            proposalMixins(
                where: { isOptimistic: true }
                first: $first
                skip: $skip
                orderBy: creationBlockNumber
                orderDirection: desc
            ) {
                id
                proposalId
                metadata
                creator
                creationTxHash
                creationBlockNumber
                executionBlockNumber
                executionTxHash
                vetoes {
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

    const allOptimisticProposals: any[] = [];
    const allMixins: any[] = [];
    const batchSize = 1000;
    let skip = 0;
    let hasMore = true;

    while (hasMore) {
      const response = await fetch(SUBGRAPH_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          variables: {
            first: batchSize,
            skip,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Subgraph request failed: ${response.status} ${response.statusText}`);
      }

      const result = (await response.json()) as any;

      if (result.errors) {
        console.error('GraphQL errors:', result.errors);
        break;
      }

      const optimisticBatch = result.data?.optimisticTokenVotingProposals || [];
      const mixinBatch = result.data?.proposalMixins || [];

      if (optimisticBatch.length === 0 && mixinBatch.length === 0) {
        hasMore = false;
      } else {
        allOptimisticProposals.push(...optimisticBatch);
        allMixins.push(...mixinBatch);
        skip += Math.max(optimisticBatch.length, mixinBatch.length);

        if (optimisticBatch.length < batchSize && mixinBatch.length < batchSize) {
          hasMore = false;
        }
      }
    }

    console.info(`Found ${allOptimisticProposals.length} public proposals in subgraph`);

    // Create a map for mixins by proposal ID
    const mixinMap = new Map();
    allMixins.forEach((mixin) => {
      mixinMap.set(mixin.proposalId, mixin);
    });

    // Process proposals and fetch metadata
    const processedProposals = await Promise.all(
      allOptimisticProposals.map(async (proposal) => {
        const mixin = mixinMap.get(proposal.id);
        let metadata: IProposalMetadata | undefined;

        const metadataHex = proposal.metadata || mixin?.metadata;
        if (metadataHex) {
          try {
            const ipfsUri = hexToString(metadataHex);
            const rawUri = ipfsUri.startsWith('ipfs://') ? ipfsUri.slice(7) : ipfsUri;
            metadata = await getIpfsFileSafe<IProposalMetadata>(rawUri);
            if (!metadata) {
              console.warn(`Could not fetch metadata for public proposal ${proposal.id}, continuing without it`);
            }
          } catch (error) {
            console.error(`Error fetching metadata for public proposal ${proposal.id}:`, error);
          }
        }

        return {
          proposalId: parseInt(proposal.id),
          executed: mixin?.executionBlockNumber !== null,
          metadataURI: metadataHex ? hexToString(metadataHex) : '',
          creator: proposal.creator,
          creatorAddress: proposal.creatorAddress,
          startDate: proposal.startDate ? new Date(parseInt(proposal.startDate) * 1000) : undefined,
          endDate: proposal.endDate ? new Date(parseInt(proposal.endDate) * 1000) : undefined,
          creationBlockNumber: BigInt(proposal.creationBlockNumber),
          executionBlockNumber: mixin?.executionBlockNumber ? BigInt(mixin.executionBlockNumber) : null,
          vetoes: mixin?.vetoes || [],
          ...metadata,
        };
      }),
    );

    return processedProposals.filter((p) => p !== undefined);
  } catch (error) {
    console.error('Error fetching public proposals from subgraph:', error);
    throw error;
  }
}
