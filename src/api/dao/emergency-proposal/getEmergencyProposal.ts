import { Address, hexToString } from "viem";
import { ABIs } from "../../../abi";
import { INetworkConfig } from "../../../types/network.type";
import { getPublicClient } from "../../viem";
import getIpfsFile from "../../ipfs/getIpfsFile";
import { IProposalMetadata } from "../../../types/proposal.type";

export default async function getEmergencyProposal(
    proposalId: number,
    config: INetworkConfig
){
    try {
    const client = getPublicClient(config)
    const res = await client.readContract({
        abi: ABIs.EmergencyMultisigPlugin,
        address: config.contracts.EmergencyMultisigPlugin,
        functionName: 'getProposal',
        args: [proposalId]
    })

   const metadataURI = res[3] as Address;

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
            ...metadata
    } 
} catch (e){
    console.error(`Error fetching emergency proposal ${proposalId}:`, e);
    console.error(e)
}
}