import { Address, createPublicClient, createWalletClient, http, WalletClient } from 'viem';
import { holesky, mainnet } from 'viem/chains';
import { INetworkConfig } from '../types/network.type';
import { privateKeyToAccount } from 'viem/accounts';

export function getPublicClient(config: INetworkConfig) {
  return createPublicClient({
    chain: config.network === 'holesky' ? holesky : mainnet,
    transport: http(config.urls.rpc),
  });
}

export function getWalletClient(config: INetworkConfig & { privateKey: Address }): WalletClient {
  return createWalletClient({
    account: privateKeyToAccount(config.privateKey),
    chain: config.network === 'holesky' ? holesky : mainnet,
    transport: http(config.urls.rpc),
  });
}
