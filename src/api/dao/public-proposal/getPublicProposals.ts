import { ABIs } from '../../../abi';
import { INetworkConfig } from '../../../types/network.type';
import { EmergencyProposal, IProposalMetadata } from '../../../types/proposal.type';
import { getPublicClient } from '../../viem';
import getPublicProposal from './getPublicProposal';

export default async function getPublicProposals(config: INetworkConfig) {
  try {
    const client = getPublicClient(config);
    const res = await client.readContract({
      abi: ABIs.OptimisticTokenVotingPlugin,
      address: config.contracts.OptimisticTokenVotingPlugin,
      functionName: 'proposalCount',
      args: [],
    });

    console.info(`Public proposal count: ${res}`);
    const promises = [];
    for (let i = 0; i < Number(res); i++) {
      promises.push(getPublicProposal(i, config));
    }

    const proposals = await Promise.all(promises);

    return proposals.filter((p) => p !== undefined).reverse();
  } catch (e) {
    console.error(e);
  }
  // return res
}
