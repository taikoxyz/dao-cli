import { INetworkConfig } from '../../types/network.type';
import { IProposalMetadata } from '../../types/proposal.type';
import getIpfsFile from '../ipfs/getIpfsFile';
import { SubgraphStandardProposal, SubgraphProposalMixin } from './types';
import { hexToString } from 'viem';

export async function getStandardProposalFromSubgraph(proposalId: number, config: INetworkConfig) {
  const query = `
        query GetStandardProposal($proposalId: String!) {
            proposalMixins(where: { proposalId: $proposalId, isStandard: true }) {
                id
                proposalId
                metadata
                creator
                isEmergency
                isStandard
                isOptimistic
                creationTxHash
                creationBlockNumber
                executionBlockNumber
                executionTxHash
                approvers {
                    id
                }
            }
            standardProposals(where: { id: $proposalId }) {
                id
                creator
                metadata
                startDate
                endDate
                contractEventId
                creationBlockNumber
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

    const mixin = result.data?.proposalMixins?.[0];
    const proposal = result.data?.standardProposals?.[0];

    if (!mixin && !proposal) {
      console.log(`Standard proposal ${proposalId} not found in subgraph`);
      return undefined;
    }

    // Parse metadata from IPFS if available
    let metadata: IProposalMetadata | undefined;
    const metadataHex = mixin?.metadata || proposal?.metadata;

    if (metadataHex) {
      try {
        const ipfsUri = hexToString(metadataHex);
        const rawUri = ipfsUri.startsWith('ipfs://') ? ipfsUri.slice(7) : ipfsUri;
        metadata = await getIpfsFile<IProposalMetadata>(rawUri);
      } catch (error) {
        console.error(`Error fetching metadata for proposal ${proposalId}:`, error);
      }
    }

    return {
      proposalId,
      executed: mixin?.executionBlockNumber !== null,
      approvals: mixin?.approvers?.length || 0,
      metadataURI: metadataHex ? hexToString(metadataHex) : '',
      creator: mixin?.creator || proposal?.creator,
      creationBlockNumber: BigInt(mixin?.creationBlockNumber || proposal?.creationBlockNumber || 0),
      executionBlockNumber: mixin?.executionBlockNumber ? BigInt(mixin.executionBlockNumber) : null,
      startDate: proposal?.startDate ? new Date(parseInt(proposal.startDate) * 1000) : undefined,
      endDate: proposal?.endDate ? new Date(parseInt(proposal.endDate) * 1000) : undefined,
      ...metadata,
    };
  } catch (error) {
    console.error(`Error fetching standard proposal ${proposalId} from subgraph:`, error);
    throw error;
  }
}

export async function getStandardProposalsFromSubgraph(config: INetworkConfig) {
  const query = `
        query GetStandardProposals($first: Int!, $skip: Int!) {
            proposalMixins(
                where: { isStandard: true }
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

    const allProposals: any[] = [];
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

      const batch = result.data?.proposalMixins || [];

      if (batch.length === 0) {
        hasMore = false;
      } else {
        allProposals.push(...batch);
        skip += batch.length;

        if (batch.length < batchSize) {
          hasMore = false;
        }
      }
    }

    console.info(`Found ${allProposals.length} standard proposals in subgraph`);

    // Process proposals and fetch metadata
    const processedProposals = await Promise.all(
      allProposals.map(async (mixin) => {
        let metadata: IProposalMetadata | undefined;

        if (mixin.metadata) {
          try {
            const ipfsUri = hexToString(mixin.metadata);
            const rawUri = ipfsUri.startsWith('ipfs://') ? ipfsUri.slice(7) : ipfsUri;
            metadata = await getIpfsFile<IProposalMetadata>(rawUri);
          } catch (error) {
            console.error(`Error fetching metadata for proposal ${mixin.proposalId}:`, error);
          }
        }

        return {
          proposalId: parseInt(mixin.proposalId),
          executed: mixin.executionBlockNumber !== null,
          approvals: mixin.approvers?.length || 0,
          metadataURI: mixin.metadata ? hexToString(mixin.metadata) : '',
          creator: mixin.creator,
          creationBlockNumber: BigInt(mixin.creationBlockNumber),
          executionBlockNumber: mixin.executionBlockNumber ? BigInt(mixin.executionBlockNumber) : null,
          ...metadata,
        };
      }),
    );

    return processedProposals.filter((p) => p !== undefined);
  } catch (error) {
    console.error('Error fetching standard proposals from subgraph:', error);
    throw error;
  }
}
