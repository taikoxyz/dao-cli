export * from './types';
export * from './standardProposals';
export * from './emergencyProposals';
export * from './publicProposals';
export * from './securityCouncil';

import { INetworkConfig } from '../../types/network.type';

export interface SubgraphProposal {
  id: string;
  metadata: string;
  creator: string;
  startDate: string;
  endDate: string;
  creatorAddress: string;
  contractEventId: string;
  creationBlockNumber: string;
}

export interface SubgraphResponse {
  data: {
    optimisticTokenVotingProposals: SubgraphProposal[];
  };
}

export async function fetchPublicProposalsFromSubgraph(
  config: INetworkConfig,
  first: number = 100,
  skip: number = 0,
): Promise<SubgraphProposal[]> {
  const SUBGRAPH_ENDPOINT = config.subgraph;

  if (!SUBGRAPH_ENDPOINT) {
    throw new Error('Subgraph endpoint is not defined in network config');
  }
  const query = `
        query GetProposals($first: Int!, $skip: Int!) {
            optimisticTokenVotingProposals(
                first: $first
                skip: $skip
                orderBy: creationBlockNumber
                orderDirection: desc
            ) {
                id
                metadata
                creator
                startDate
                endDate
                creatorAddress
                contractEventId
                creationBlockNumber
            }
        }
    `;

  try {
    const response = await fetch(SUBGRAPH_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables: {
          first,
          skip,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Subgraph request failed: ${response.status} ${response.statusText}`);
    }

    const result = (await response.json()) as SubgraphResponse;

    if (!result.data || !result.data.optimisticTokenVotingProposals) {
      console.error('Invalid subgraph response:', result);
      return [];
    }

    return result.data.optimisticTokenVotingProposals;
  } catch (error) {
    console.error('Error fetching proposals from subgraph:', error);
    throw error;
  }
}

export async function fetchAllPublicProposalsFromSubgraph(config: INetworkConfig): Promise<SubgraphProposal[]> {
  const SUBGRAPH_ENDPOINT = config.subgraph;

  if (!SUBGRAPH_ENDPOINT) {
    throw new Error('Subgraph endpoint is not defined in network config');
  }
  const allProposals: SubgraphProposal[] = [];
  const batchSize = 1000;
  let skip = 0;
  let hasMore = true;

  while (hasMore) {
    const batch = await fetchPublicProposalsFromSubgraph(config, batchSize, skip);

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

  return allProposals;
}
