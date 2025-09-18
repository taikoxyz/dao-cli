import * as dotenv from 'dotenv';
import { INetworkConfig } from '../../types/network.type';
// import { getPublicClient, getWalletClient } from '../viem';
import { createWalletClient, http, WalletClient } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { holesky, mainnet } from 'viem/chains';
import { normalizePrivateKey } from '../../util/normalizePrivateKey';

// Load environment variables
dotenv.config();

export default async function connectEnvWallet(config: INetworkConfig): Promise<WalletClient> {
  let privateKey: string = '';
  if (config.network === 'holesky') {
    privateKey = process.env.HOLESKY_PRIVATE_KEY || '';
  } else if (config.network === 'mainnet') {
    privateKey = process.env.MAINNET_PRIVATE_KEY || '';
  }
  if (!privateKey) {
    throw new Error(
      `No private key found for network ${config.network}. Please set HOLESKY_PRIVATE_KEY or MAINNET_PRIVATE_KEY in your .env file.`,
    );
  }

  const normalizedPrivateKey = normalizePrivateKey(privateKey);

  const walletClient = createWalletClient({
    account: privateKeyToAccount(normalizedPrivateKey),
    chain: config.network === 'holesky' ? holesky : mainnet,
    transport: http(config.urls.rpc),
  });

  return walletClient;
}
