/**
 * Market Data Cache Utility
 * 
 * Provides a centralized cache for market data to ensure consistency 
 * between agents and prevent data loss during agent communication.
 */

export interface CachedMarketData {
  token: string;
  id?: string;
  price?: number;
  change_24h?: number;
  market_cap?: number;
  volume_24h?: number;
  source?: string;
  timestamp: string;
  error?: string;
}

export interface MarketDataCache {
  data: CachedMarketData[];
  lastUpdated: string;
  query: string;
}

// Global in-memory cache with TTL
const marketCache = new Map<string, { data: MarketDataCache; expiry: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Creates a cache key from the normalized token list
 */
function createCacheKey(tokens: string[]): string {
  return tokens
    .map(t => t.toLowerCase().trim())
    .sort()
    .join(',');
}

/**
 * Store market data in cache
 */
export function cacheMarketData(query: string, tokens: string[], marketData: CachedMarketData[]): void {
  const key = createCacheKey(tokens);
  const cacheEntry: MarketDataCache = {
    data: marketData,
    lastUpdated: new Date().toISOString(),
    query: query.trim()
  };
  
  marketCache.set(key, {
    data: cacheEntry,
    expiry: Date.now() + CACHE_TTL
  });
  
  console.log(`[market-cache] Cached market data for key: ${key}, tokens: ${tokens.length}`);
}

/**
 * Retrieve market data from cache
 */
export function getCachedMarketData(tokens: string[]): MarketDataCache | null {
  const key = createCacheKey(tokens);
  const cached = marketCache.get(key);
  
  if (!cached) {
    console.log(`[market-cache] No cache entry for key: ${key}`);
    return null;
  }
  
  if (Date.now() > cached.expiry) {
    marketCache.delete(key);
    console.log(`[market-cache] Cache expired for key: ${key}`);
    return null;
  }
  
  console.log(`[market-cache] Cache hit for key: ${key}`);
  return cached.data;
}

/**
 * Clear expired entries from cache
 */
export function cleanupMarketCache(): void {
  const now = Date.now();
  let cleaned = 0;
  
  for (const [key, entry] of marketCache.entries()) {
    if (now > entry.expiry) {
      marketCache.delete(key);
      cleaned++;
    }
  }
  
  if (cleaned > 0) {
    console.log(`[market-cache] Cleaned up ${cleaned} expired entries`);
  }
}

/**
 * Get all cached market data (for debugging)
 */
export function getAllCachedData(): Array<{ key: string; data: MarketDataCache; expiresIn: number }> {
  const now = Date.now();
  return Array.from(marketCache.entries()).map(([key, entry]) => ({
    key,
    data: entry.data,
    expiresIn: Math.max(0, entry.expiry - now)
  }));
}

// Automatic cleanup every 10 minutes
setInterval(cleanupMarketCache, 10 * 60 * 1000);