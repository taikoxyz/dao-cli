import axios from 'axios';
import * as dotenv from 'dotenv';
import wait from '../../util/wait';
import { cache } from '../cache';
dotenv.config();
const IPFS_GATEWAY = process.env.IPFS_GATEWAY || 'https://ipfs.io/ipfs';

// Fallback gateways if the primary one fails
const FALLBACK_GATEWAYS = [
  'https://gateway.pinata.cloud/ipfs',
  'https://cloudflare-ipfs.com/ipfs',
  'https://dweb.link/ipfs',
  'https://ipfs.io/ipfs'
];

async function tryFetchFromGateway<T>(gateway: string, hash: string): Promise<T | null> {
  try {
    const url = `${gateway}/${hash}`;

    const res = await axios.get(url, {
      timeout: 10000, // 10 second timeout
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; TaikoDAOCLI/1.0; +https://github.com/taikoxyz/dao-cli)',
      },
    });
    return res.data as T;
  } catch (error: any) {
    if (error.response?.status === 403) {
      console.warn(`Gateway ${gateway} returned 403 Forbidden`);
    } else if (error.response?.status === 429) {
      console.warn(`Gateway ${gateway} returned 429 Rate Limited`);
    } else {
      console.warn(`Gateway ${gateway} failed: ${error.message}`);
    }
    return null;
  }
}

export default async function getIpfsFile<T>(hash: string): Promise<T | undefined> {
  const inCache = await cache.has(`ipfs:${hash}`);
  if (inCache) {
    console.info(`Using cached IPFS file for hash ${hash}`);
    return cache.get(`ipfs:${hash}`) as T;
  }
  
  // Try primary gateway first
  const gateways = [IPFS_GATEWAY, ...FALLBACK_GATEWAYS.filter(g => g !== IPFS_GATEWAY)];
  
  for (const gateway of gateways) {
    // artifical wait to not overload the IPFS gateway
    await wait(500);
    
    const content = await tryFetchFromGateway<T>(gateway, hash);
    if (content !== null) {
      await cache.set(`ipfs:${hash}`, content);
      return content;
    }
  }
  
  console.error(`Failed to fetch IPFS file with hash ${hash} from all gateways`);
  console.error(`Tried gateways: ${gateways.join(', ')}`);
  console.error(`\nYou can set a custom IPFS gateway by setting the IPFS_GATEWAY environment variable`);
  process.exit(1);
}
