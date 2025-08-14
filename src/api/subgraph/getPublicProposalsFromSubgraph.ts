import { INetworkConfig } from "../../types/network.type";
import { IProposalMetadata } from "../../types/proposal.type";
import getIpfsFile from "../ipfs/getIpfsFile";
import { fetchAllPublicProposalsFromSubgraph, SubgraphProposal } from "./index";

interface ProcessedProposal {
    proposalId: string;
    metadata: IProposalMetadata | null;
    creator: string;
    startDate: Date;
    endDate: Date;
    creatorAddress: string;
    contractEventId: string;
    creationBlockNumber: bigint;
}

async function parseMetadata(metadataUri: string): Promise<IProposalMetadata | null> {
    try {
        if (!metadataUri || metadataUri === "") {
            return null;
        }

        if (metadataUri.startsWith("ipfs://")) {
            const ipfsHash = metadataUri.replace("ipfs://", "");
            const metadata = await getIpfsFile(ipfsHash);
            return metadata as IProposalMetadata;
        }

        return null;
    } catch (error) {
        console.error("Error parsing metadata:", error);
        return null;
    }
}

function processProposal(proposal: SubgraphProposal): ProcessedProposal {
    return {
        proposalId: proposal.id,
        metadata: null,
        creator: proposal.creator,
        startDate: new Date(parseInt(proposal.startDate) * 1000),
        endDate: new Date(parseInt(proposal.endDate) * 1000),
        creatorAddress: proposal.creatorAddress,
        contractEventId: proposal.contractEventId,
        creationBlockNumber: BigInt(proposal.creationBlockNumber)
    };
}

export async function getPublicProposalsFromSubgraph(
    config: INetworkConfig,
    fetchMetadata: boolean = true
): Promise<ProcessedProposal[]> {
    try {
        console.info("Fetching public proposals from subgraph...");
        
        const proposals = await fetchAllPublicProposalsFromSubgraph(config);
        
        console.info(`Found ${proposals.length} proposals in subgraph`);
        
        const processedProposals = proposals.map(processProposal);
        
        if (fetchMetadata) {
            console.info("Fetching metadata for proposals...");
            
            const metadataPromises = proposals.map(async (proposal, index) => {
                const metadata = await parseMetadata(proposal.metadata);
                processedProposals[index].metadata = metadata;
            });
            
            await Promise.all(metadataPromises);
        }
        
        return processedProposals;
    } catch (error) {
        console.error("Error fetching public proposals from subgraph:", error);
        throw error;
    }
}