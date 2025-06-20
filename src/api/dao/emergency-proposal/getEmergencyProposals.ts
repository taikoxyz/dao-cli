import { ABIs } from "../../../abi";
import { INetworkConfig } from "../../../types/network.type";
import { EmergencyProposal, IProposalMetadata } from "../../../types/proposal.type";
import { getPublicClient } from "../../viem";
import getEmergencyProposal from "./getEmergencyProposal";



export default async function getEmergencyProposals(

    config: INetworkConfig
){
    try {
    const client = getPublicClient(config)
    const res = await client.readContract({
        abi: ABIs.EmergencyMultisigPlugin,
        address: config.contracts.EmergencyMultisigPlugin,
        functionName: 'proposalCount',
        args: []
    })

    console.log(`Emergency proposal count: ${res}`);
    const promises = []
    for (let i = 0; i < Number(res); i++) {
    promises.push(getEmergencyProposal(i, config));
}

const proposals =await Promise.all(promises)

return proposals.filter(p => p!== undefined).reverse()
    } catch (e){
        console.error(e)
    }
   // return res  
}