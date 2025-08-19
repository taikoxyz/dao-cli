import { INetworkConfig } from '../../../types/network.type';
import { getPublicClient } from '../../viem';
import { ABIs } from '../../../abi';
import { Address } from 'viem';
import { getNetworkCache } from '../../cache';

export default async function getSecurityCouncilMembers(
  config: INetworkConfig,
): Promise<{ owner: Address; signer: Address }[]> {
  const cache = getNetworkCache(config.network);
  const inCache = await cache.has('signerList');
  if (inCache) {
    console.info(`Using cached signer list for ${config.network}`);
    return (await cache.get('signerList')) as { owner: Address; signer: Address }[];
  }

  const address = config.contracts.SignerList;
  const client = getPublicClient(config);

  const encryptionAgents = await client.readContract({
    address,
    abi: ABIs.SignerList,
    functionName: 'getEncryptionAgents',
    args: [],
  });
  const out = [];
  const blockNumber = (await client.getBlockNumber()) - 10n;
  for (const signer of encryptionAgents) {
    try {
      const owner = (await client.readContract({
        address,
        abi: ABIs.SignerList,
        functionName: 'getListedEncryptionOwnerAtBlock',
        args: [signer as Address, blockNumber],
      })) as unknown as Address;

      out.push({ owner, signer });
      cache.set('signerList', out);
    } catch (e) {
      console.error(`Error fetching owner for signer ${signer}:`, e);
    }
  }
  return out;
}
