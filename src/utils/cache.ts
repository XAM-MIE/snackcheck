// Cache utility functions
import { CacheEntry } from './types';
import { CACHE_CONFIG } from './constants';

export class CacheManager {
  private static instance: CacheManager;
  private cache: Map<string, CacheEntry> = new Map();

  static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  set(key: string, data: unknown, ttl: number = CACHE_CONFIG.INGREDIENT_TTL): void {
    const entry: CacheEntry = {
      key,
      data,
      timestamp: new Date(),
      ttl,
    };

    this.cache.set(key, entry);
    this.cleanup();
  }

  get(key: string): unknown | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    const now = new Date().getTime();
    const entryTime = entry.timestamp.getTime();
    
    if (now - entryTime > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  private cleanup(): void {
    if (this.cache.size <= CACHE_CONFIG.MAX_ENTRIES) {
      return;
    }

    const now = new Date().getTime();
    const entries = Array.from(this.cache.entries());
    
    // Remove expired entries first
    entries.forEach(([key, entry]) => {
      if (now - entry.timestamp.getTime() > entry.ttl) {
        this.cache.delete(key);
      }
    });

    // If still over limit, remove oldest entries
    if (this.cache.size > CACHE_CONFIG.MAX_ENTRIES) {
      const sortedEntries = entries
        .filter(([key]) => this.cache.has(key))
        .sort((a, b) => a[1].timestamp.getTime() - b[1].timestamp.getTime());
      
      const toRemove = this.cache.size - CACHE_CONFIG.MAX_ENTRIES;
      for (let i = 0; i < toRemove; i++) {
        this.cache.delete(sortedEntries[i][0]);
      }
    }
  }

  clear(): void {
    this.cache.clear();
  }
}