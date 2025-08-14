import { INetworkConfig } from "../../types/network.type";
import { IProposalMetadata } from "../../types/proposal.type";
import getIpfsFile from "../ipfs/getIpfsFile";
import { SubgraphEmergencyProposal, SubgraphProposalMixin } from "./types";
import { hexToString } from "viem";

export async function getEmergencyProposalFromSubgraph(
    proposalId: number,
    config: INetworkConfig
) {
    const query = `
        query GetEmergencyProposal($proposalId: String!) {
            proposalMixins(where: { proposalId: $proposalId, isEmergency: true }) {
                id
                proposalId
                metadata
                creator
                isEmergency
                creationTxHash
                creationBlockNumber
                executionBlockNumber
                executionTxHash
                approvers {
                    id
                }
            }
            emergencyProposals(where: { id: $proposalId }) {
                id
                creator
                encryptedPayloadURI
                approvers {
                    id
                }
                contractEventId
                creationBlockNumber
            }
        }
    `;

    try {
        const SUBGRAPH_ENDPOINT = config.subgraph;
        if (!SUBGRAPH_ENDPOINT) {
            throw new Error("Subgraph endpoint is not defined in network config");
        }
        
        const response = await fetch(SUBGRAPH_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                query,
                variables: {
                    proposalId: proposalId.toString()
                }
            })
        });

        if (!response.ok) {
            throw new Error(`Subgraph request failed: ${response.status} ${response.statusText}`);
        }

        const result = await response.json() as any;
        
        if (result.errors) {
            console.error("GraphQL errors:", result.errors);
            return undefined;
        }

        const mixin = result.data?.proposalMixins?.[0];
        const proposal = result.data?.emergencyProposals?.[0];
        
        if (!mixin && !proposal) {
            console.log(`Emergency proposal ${proposalId} not found in subgraph`);
            return undefined;
        }

        // Parse metadata from IPFS if available
        let metadata: IProposalMetadata | undefined;
        const metadataHex = mixin?.metadata || proposal?.encryptedPayloadURI;
        
        if (metadataHex) {
            try {
                const ipfsUri = hexToString(metadataHex);
                const rawUri = ipfsUri.startsWith('ipfs://') ? ipfsUri.slice(7) : ipfsUri;
                metadata = await getIpfsFile<IProposalMetadata>(rawUri);
            } catch (error) {
                console.error(`Error fetching metadata for emergency proposal ${proposalId}:`, error);
            }
        }

        return {
            proposalId,
            executed: mixin?.executionBlockNumber !== null,
            approvals: mixin?.approvers?.length || proposal?.approvers?.length || 0,
            metadataURI: metadataHex ? hexToString(metadataHex) : '',
            encryptedPayloadURI: proposal?.encryptedPayloadURI ? hexToString(proposal.encryptedPayloadURI) : '',
            creator: mixin?.creator || proposal?.creator,
            creationBlockNumber: BigInt(mixin?.creationBlockNumber || proposal?.creationBlockNumber || 0),
            executionBlockNumber: mixin?.executionBlockNumber ? BigInt(mixin.executionBlockNumber) : null,
            approvers: mixin?.approvers || proposal?.approvers || [],
            ...metadata
        };
    } catch (error) {
        console.error(`Error fetching emergency proposal ${proposalId} from subgraph:`, error);
        throw error;
    }
}

export async function getEmergencyProposalsFromSubgraph(
    config: INetworkConfig
) {
    const query = `
        query GetEmergencyProposals($first: Int!, $skip: Int!) {
            proposalMixins(
                where: { isEmergency: true }
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
            emergencyProposals(
                first: $first
                skip: $skip
                orderBy: creationBlockNumber
                orderDirection: desc
            ) {
                id
                creator
                encryptedPayloadURI
                approvers {
                    id
                }
                contractEventId
                creationBlockNumber
            }
        }
    `;

    try {
        const SUBGRAPH_ENDPOINT = config.subgraph;
        if (!SUBGRAPH_ENDPOINT) {
            throw new Error("Subgraph endpoint is not defined in network config");
        }
        
        const allMixins: any[] = [];
        const allEmergencyProposals: any[] = [];
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
                        skip
                    }
                })
            });

            if (!response.ok) {
                throw new Error(`Subgraph request failed: ${response.status} ${response.statusText}`);
            }

            const result = await response.json() as any;
            
            if (result.errors) {
                console.error("GraphQL errors:", result.errors);
                break;
            }

            const mixinBatch = result.data?.proposalMixins || [];
            const emergencyBatch = result.data?.emergencyProposals || [];
            
            if (mixinBatch.length === 0 && emergencyBatch.length === 0) {
                hasMore = false;
            } else {
                allMixins.push(...mixinBatch);
                allEmergencyProposals.push(...emergencyBatch);
                skip += Math.max(mixinBatch.length, emergencyBatch.length);
                
                if (mixinBatch.length < batchSize && emergencyBatch.length < batchSize) {
                    hasMore = false;
                }
            }
        }

        console.info(`Found ${allMixins.length} emergency proposals in subgraph`);

        // Create a map for emergency proposals by ID
        const emergencyMap = new Map();
        allEmergencyProposals.forEach(ep => {
            emergencyMap.set(ep.id, ep);
        });

        // Process proposals and fetch metadata
        const processedProposals = await Promise.all(
            allMixins.map(async (mixin) => {
                const emergencyData = emergencyMap.get(mixin.proposalId);
                let metadata: IProposalMetadata | undefined;
                
                const metadataHex = mixin.metadata || emergencyData?.encryptedPayloadURI;
                if (metadataHex) {
                    try {
                        const ipfsUri = hexToString(metadataHex);
                        const rawUri = ipfsUri.startsWith('ipfs://') ? ipfsUri.slice(7) : ipfsUri;
                        metadata = await getIpfsFile<IProposalMetadata>(rawUri);
                    } catch (error) {
                        console.error(`Error fetching metadata for emergency proposal ${mixin.proposalId}:`, error);
                    }
                }

                return {
                    proposalId: parseInt(mixin.proposalId),
                    executed: mixin.executionBlockNumber !== null,
                    approvals: mixin.approvers?.length || emergencyData?.approvers?.length || 0,
                    metadataURI: metadataHex ? hexToString(metadataHex) : '',
                    encryptedPayloadURI: emergencyData?.encryptedPayloadURI ? hexToString(emergencyData.encryptedPayloadURI) : '',
                    creator: mixin.creator,
                    creationBlockNumber: BigInt(mixin.creationBlockNumber),
                    executionBlockNumber: mixin.executionBlockNumber ? BigInt(mixin.executionBlockNumber) : null,
                    approvers: mixin.approvers || emergencyData?.approvers || [],
                    ...metadata
                };
            })
        );

        return processedProposals.filter(p => p !== undefined);
    } catch (error) {
        console.error("Error fetching emergency proposals from subgraph:", error);
        throw error;
    }
}