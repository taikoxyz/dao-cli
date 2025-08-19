import * as fs from 'fs/promises';
import * as path from 'path';

interface CacheData {
  [key: string]: unknown;
}

class JsonCache {
  private filePath: string;
  private cache: CacheData = {};
  private networkId?: string;

  constructor(fileName: string = '.cache.json', networkId?: string) {
    // If networkId is provided, make the cache file network-specific
    const cacheFileName = networkId ? `.cache-${networkId}.json` : fileName;
    this.filePath = path.join(process.cwd(), cacheFileName);
    this.networkId = networkId;
    this.loadCache();
  }

  // Load cache from file on initialization
  private async loadCache(): Promise<void> {
    try {
      const data = await fs.readFile(this.filePath, 'utf-8');
      this.cache = JSON.parse(data);
    } catch {
      // File doesn't exist or is invalid, start with empty cache
      this.cache = {};
    }
  }

  // Save current cache to file
  private async saveCache(): Promise<void> {
    try {
      await fs.writeFile(this.filePath, JSON.stringify(this.cache, null, 2));
    } catch (error) {
      console.error('Error saving cache:', error);
      throw error;
    }
  }

  // Get a value from cache
  async get<T = unknown>(key: string): Promise<T | null> {
    await this.loadCache(); // Reload to get latest data
    return (this.cache[key] as T) || null;
  }

  // Set a value in cache
  async set(key: string, value: unknown): Promise<void> {
    await this.loadCache(); // Reload to avoid overwriting other changes
    this.cache[key] = value;
    await this.saveCache();
  }

  // Delete a key from cache
  async delete(key: string): Promise<boolean> {
    await this.loadCache();
    if (key in this.cache) {
      delete this.cache[key];
      await this.saveCache();
      return true;
    }
    return false;
  }

  // Check if key exists
  async has(key: string): Promise<boolean> {
    await this.loadCache();
    return key in this.cache;
  }

  // Get all keys
  async keys(): Promise<string[]> {
    await this.loadCache();
    return Object.keys(this.cache);
  }

  // Clear entire cache
  async clear(): Promise<void> {
    this.cache = {};
    await this.saveCache();
  }

  // Get entire cache object
  async getAll(): Promise<CacheData> {
    await this.loadCache();
    return { ...this.cache };
  }

  // Set multiple values at once
  async setMultiple(data: CacheData): Promise<void> {
    await this.loadCache();
    Object.assign(this.cache, data);
    await this.saveCache();
  }
}

// Map to hold network-specific cache instances
const networkCaches = new Map<string, JsonCache>();

// Get network-specific cache instance
export function getNetworkCache(networkId: string): JsonCache {
  if (!networkCaches.has(networkId)) {
    networkCaches.set(networkId, new JsonCache(`.cache-${networkId}.json`, networkId));
  }
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return networkCaches.get(networkId)!;
}

// Export default singleton for backward compatibility
export const cache = new JsonCache();

// Also export the class for custom instances
export { JsonCache };
