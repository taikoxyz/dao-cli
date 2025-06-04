import { createPublicClient, http } from 'viem';
import { holesky, mainnet } from 'viem/chains';
import { INetworkConfig } from '../types/network.type';

export function getPublicClient(config: INetworkConfig) {
  return createPublicClient({
    chain: config.network === 'holesky' ? holesky : mainnet,
    transport: http(config.urls.rpc),
  });
}
