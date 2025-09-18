import * as dotenv from 'dotenv';
import { INetworkConfig } from '../../types/network.type';
import { Address } from 'viem';
import { normalizePrivateKey } from '../../util/normalizePrivateKey';

// Load environment variables
dotenv.config();

export default function getEnvPrivateKey(config: INetworkConfig): Address {
  let privateKey: string = '';
  if (config.network === 'holesky') {
    privateKey = process.env.HOLESKY_PRIVATE_KEY || '';
  } else if (config.network === 'mainnet') {
    privateKey = process.env.MAINNET_PRIVATE_KEY || '';
  }

  if (!privateKey) {
    return '0x' as Address;
  }

  return normalizePrivateKey(privateKey);
}
