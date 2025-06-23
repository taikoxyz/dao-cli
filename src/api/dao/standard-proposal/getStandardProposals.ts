import { ABIs } from "../../../abi";
import { INetworkConfig } from "../../../types/network.type";
import { IProposalMetadata } from "../../../types/proposal.type";
import { getPublicClient } from "../../viem";
import getStandardProposal from "./getStandardProposal";

export default async function getStandardProposals(

    config: INetworkConfig
){
    try {
    const client = getPublicClient(config)
    const res = await client.readContract({
        abi: ABIs.MultisigPlugin,
        address: config.contracts.MultisigPlugin,
        functionName: 'proposalCount',
        args: []
    })

    console.info(`Standard proposal count: ${res}`);
    const promises = []
    for (let i = 0; i < Number(res); i++) {
    promises.push(getStandardProposal(i, config));
}

const proposals =await Promise.all(promises)

return proposals.filter(p => p!== undefined).reverse()
    } catch (e){
        console.error(e)
    }
   // return res  
}