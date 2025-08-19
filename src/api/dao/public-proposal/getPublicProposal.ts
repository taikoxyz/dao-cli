import { Address, hexToString } from 'viem';
import { ABIs } from '../../../abi';
import { INetworkConfig } from '../../../types/network.type';
import { getPublicClient } from '../../viem';
import getIpfsFile from '../../ipfs/getIpfsFile';
import { IProposalMetadata } from '../../../types/proposal.type';

export default async function getPublicProposal(count: number, config: INetworkConfig) {
  try {
    const client = getPublicClient(config);
    const proposalId = await client.readContract({
      abi: ABIs.OptimisticTokenVotingPlugin,
      address: config.contracts.OptimisticTokenVotingPlugin,
      functionName: 'proposalIds',
      args: [count],
    });
    const res = await client.readContract({
      abi: ABIs.OptimisticTokenVotingPlugin,
      address: config.contracts.OptimisticTokenVotingPlugin,
      functionName: 'getProposal',
      args: [proposalId],
    });

    const metadataURI = res[4] as Address;

    const ipfsUri = hexToString(metadataURI);
    const rawUri = ipfsUri.startsWith('ipfs://') ? ipfsUri.slice(7) : ipfsUri;

    const metadata = await getIpfsFile<IProposalMetadata>(rawUri);
    return {
      executed: res[0],
      approvals: res[1],
      parameters: res[2],
      metadataURI: ipfsUri,
      destinationActions: res[4],
      destinationPlugin: res[5] as Address,
      proposalId,
      ...metadata,
    };
  } catch (e) {
    console.error(`Error fetching public proposal ${count}:`, e);
    console.error(e);
  }
}
