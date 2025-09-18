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
  'https://ipfs.io/ipfs',
];

interface GatewayResult<T> {
  content: T | null;
  isTimeout: boolean;
  isNotFound: boolean;
}

async function tryFetchFromGateway<T>(gateway: string, hash: string): Promise<GatewayResult<T>> {
  try {
    const url = `${gateway}/${hash}`;

    const res = await axios.get(url, {
      timeout: 10000, // 10 second timeout
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; TaikoDAOCLI/1.0; +https://github.com/taikoxyz/dao-cli)',
      },
    });
    return { content: res.data as T, isTimeout: false, isNotFound: false };
  } catch (error: unknown) {
    const err = error as {
      response?: { status: number };
      message?: string;
      code?: string;
    };

    const isTimeout = err.code === 'ECONNABORTED' || (err.message?.includes('timeout') ?? false);
    const isNotFound = err.response?.status === 404;

    if (err.response?.status === 403) {
      console.warn(`Gateway ${gateway} returned 403 Forbidden`);
    } else if (err.response?.status === 429) {
      console.warn(`Gateway ${gateway} returned 429 Rate Limited`);
    } else if (isTimeout) {
      console.warn(`Gateway ${gateway} timed out`);
    } else if (isNotFound) {
      console.warn(`Gateway ${gateway} returned 404 Not Found`);
    } else {
      console.warn(`Gateway ${gateway} failed: ${err.message || 'Unknown error'}`);
    }

    return { content: null, isTimeout, isNotFound };
  }
}

export default async function getIpfsFile<T>(hash: string, exitOnError: boolean = true): Promise<T | undefined> {
  const inCache = await cache.has(`ipfs:${hash}`);
  if (inCache) {
    console.info(`Using cached IPFS file for hash ${hash}`);
    return cache.get(`ipfs:${hash}`) as T;
  }

  // Check if this hash is marked as missing
  const missingKey = `ipfs:missing:${hash}`;
  const isMissing = await cache.has(missingKey);
  if (isMissing) {
    console.info(`Hash ${hash} is marked as missing, returning [NOT FOUND] marker`);
    return `[NOT FOUND]:${hash}` as T;
  }

  // Try primary gateway first
  const gateways = [IPFS_GATEWAY, ...FALLBACK_GATEWAYS.filter((g) => g !== IPFS_GATEWAY)];
  let timeoutCount = 0;
  let notFoundCount = 0;

  for (const gateway of gateways) {
    // artifical wait to not overload the IPFS gateway
    await wait(500);

    const result = await tryFetchFromGateway<T>(gateway, hash);
    if (result.content !== null) {
      await cache.set(`ipfs:${hash}`, result.content);
      return result.content;
    } else {
      if (result.isTimeout) {
        timeoutCount++;
      }
      if (result.isNotFound) {
        notFoundCount++;
      }
    }
  }

  // If we have at least 3 failures with timeouts or not found, mark as missing
  // This covers cases where gateways timeout or where the file doesn't exist
  const failureCount = timeoutCount + notFoundCount;
  if (failureCount >= 3) {
    console.warn(
      `Hash ${hash} failed on ${failureCount} gateways (${timeoutCount} timeouts, ${notFoundCount} not found), marking as missing`,
    );
    const metadata: MissingHashMetadata = {
      markedAt: Date.now(),
      gatewayCount: gateways.length,
      timeoutCount,
      notFoundCount,
    };
    await cache.set(missingKey, metadata);
  }

  console.error(`Failed to fetch IPFS file with hash ${hash} from all gateways`);
  console.error(`Tried gateways: ${gateways.join(', ')}`);

  if (exitOnError) {
    console.error(`\nYou can set a custom IPFS gateway by setting the IPFS_GATEWAY environment variable`);
    process.exit(1);
  } else {
    console.warn(`Skipping IPFS file ${hash} - unable to fetch from any gateway`);
    return `[NOT FOUND]:${hash}` as T;
  }
}

/**
 * Fetch IPFS file with graceful failure handling
 * This version will not exit on error and is suitable for batch operations
 */
export async function getIpfsFileSafe<T>(hash: string): Promise<T | undefined> {
  return getIpfsFile<T>(hash, false);
}

/**
 * Clear a missing hash from the cache (in case it becomes available later)
 */
export async function clearMissingHash(hash: string): Promise<void> {
  const missingKey = `ipfs:missing:${hash}`;
  await cache.delete(missingKey);
}

/**
 * Check if a hash is marked as missing
 */
export async function isMissingHash(hash: string): Promise<boolean> {
  const missingKey = `ipfs:missing:${hash}`;
  return cache.has(missingKey);
}

interface MissingHashMetadata {
  markedAt: number;
  gatewayCount: number;
  timeoutCount: number;
  notFoundCount: number;
}

/**
 * Check if a value is a [NOT FOUND] marker
 */
export function isNotFoundMarker<T>(value: T): value is T & string {
  return typeof value === 'string' && value.startsWith('[NOT FOUND]:');
}

/**
 * Extract hash from a [NOT FOUND] marker
 */
export function extractHashFromNotFoundMarker(marker: string): string {
  return marker.replace('[NOT FOUND]:', '');
}

/**
 * Get all missing hashes with their metadata
 */
export async function getMissingHashes(): Promise<Record<string, MissingHashMetadata>> {
  const allKeys = await cache.keys();
  const missingKeys = allKeys.filter((key) => key.startsWith('ipfs:missing:'));
  const missingHashes: Record<string, MissingHashMetadata> = {};

  for (const key of missingKeys) {
    const hash = key.replace('ipfs:missing:', '');
    const metadata = (await cache.get(key)) as MissingHashMetadata;
    missingHashes[hash] = metadata;
  }

  return missingHashes;
}
