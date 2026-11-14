import type { AIQueryResponse } from './types.js';

interface CacheEntry {
  response: AIQueryResponse;
  expiresAt: number;
}

export class QueryCache {
  private cache: Map<string, CacheEntry> = new Map();
  private maxEntries: number;
  private defaultTtlMs: number;

  constructor(maxEntries: number = 200, defaultTtlMs: number = 5 * 60 * 1000) {
    this.maxEntries = maxEntries;
    this.defaultTtlMs = defaultTtlMs;
  }

  /**
   * Normalizes intent string by lowering case, removing punctuation, and collapsing whitespace
   */
  public normalizeKey(question: string): string {
    return question
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Retrieve cached query response if present and not expired
   */
  public get(question: string): AIQueryResponse | null {
    const key = this.normalizeKey(question);
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    // Refresh LRU ordering by re-inserting
    this.cache.delete(key);
    this.cache.set(key, entry);

    return {
      ...entry.response,
      cached: true,
      executionTimeMs: 1, // Sub-millisecond in-memory cache hit
    };
  }

  /**
   * Store a query response in the LRU cache with expiration
   */
  public set(question: string, response: AIQueryResponse, ttlMs?: number): void {
    const key = this.normalizeKey(question);

    // Evict oldest entry if at capacity
    if (this.cache.size >= this.maxEntries && !this.cache.has(key)) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    const expiresAt = Date.now() + (ttlMs ?? this.defaultTtlMs);
    this.cache.set(key, { response, expiresAt });
  }

  public clear(): void {
    this.cache.clear();
  }

  public size(): number {
    return this.cache.size;
  }
}

// Global query cache singleton
export const queryCache = new QueryCache();
