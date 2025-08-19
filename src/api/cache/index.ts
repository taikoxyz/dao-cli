import * as fs from 'fs/promises';
import * as path from 'path';

interface CacheData {
  [key: string]: any;
}

class JsonCache {
  private filePath: string;
  private cache: CacheData = {};

  constructor(fileName: string = '.cache.json') {
    this.filePath = path.join(process.cwd(), fileName);
    this.loadCache();
  }

  // Load cache from file on initialization
  private async loadCache(): Promise<void> {
    try {
      const data = await fs.readFile(this.filePath, 'utf-8');
      this.cache = JSON.parse(data);
    } catch (error) {
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
  async get<T = any>(key: string): Promise<T | null> {
    await this.loadCache(); // Reload to get latest data
    return this.cache[key] || null;
  }

  // Set a value in cache
  async set(key: string, value: any): Promise<void> {
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

// Export a singleton instance
export const cache = new JsonCache();

// Also export the class for custom instances
export { JsonCache };
