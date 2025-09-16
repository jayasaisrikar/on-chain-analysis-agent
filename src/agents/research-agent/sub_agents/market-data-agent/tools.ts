import { createTool } from "@iqai/adk";
import { z } from "zod";
import { env } from "../../../../env";

// Shared Coingecko cache with TTL (Time-To-Live)
interface CacheEntry {
  data: unknown;
  timestamp: number;
}

const coingeckoCache = new Map<string, CacheEntry>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isCacheValid(entry: CacheEntry): boolean {
  return Date.now() - entry.timestamp < CACHE_TTL;
}

async function coingeckoFetchRaw(url: string, retries = 3): Promise<any> {
  const cacheEntry = coingeckoCache.get(url);
  if (cacheEntry && isCacheValid(cacheEntry)) {
    return cacheEntry.data;
  }

  const headers: Record<string, string> = {
    'Accept': 'application/json',
  };
  
  let finalUrl = url;
  let triedPublicFallback = false;

  // Handle API key and URL construction
  if (env.COINGECKO_API_KEY) {
    headers["X-CG-Pro-API-Key"] = env.COINGECKO_API_KEY;
    
    try {
      const urlObj = new URL(url);
      if (urlObj.host === "api.coingecko.com") {
        urlObj.host = "pro-api.coingecko.com";
      }
      urlObj.searchParams.set("x_cg_pro_api_key", env.COINGECKO_API_KEY);
      finalUrl = urlObj.toString();
    } catch (err) {
      // If URL parsing fails, append API key as query parameter
      finalUrl = `${url}${url.includes("?") ? "&" : "?"}x_cg_pro_api_key=${encodeURIComponent(env.COINGECKO_API_KEY)}`;
    }
  }

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      console.debug(`[market-data] Fetch attempt ${attempt + 1} -> ${finalUrl}`);
      
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000); // Increased timeout
      
      const res = await fetch(finalUrl, { 
        headers, 
        signal: controller.signal 
      });
      
      clearTimeout(timeout);

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        console.debug(`[market-data] non-ok response ${res.status} ${text}`);

        // Handle rate limiting and authentication errors
        if (res.status === 429) {
          const retryAfter = res.headers.get('Retry-After') || '5';
          await sleep(parseInt(retryAfter) * 1000);
          continue;
        }

        // Fallback to public API for pro-api errors
        if (finalUrl.includes("pro-api.coingecko.com") && 
            (res.status === 400 || res.status === 401 || res.status === 403)) {
          if (!triedPublicFallback) {
            console.debug(`[market-data] pro-api error ${res.status}; attempting public API fallback`);
            finalUrl = finalUrl.replace("pro-api.coingecko.com", "api.coingecko.com")
                              .replace(/x_cg_pro_api_key=[^&]*&?/, '')
                              .replace(/[?&]$/, '');
            delete headers["X-CG-Pro-API-Key"];
            triedPublicFallback = true;
            await sleep(1000);
            continue;
          }
        }

        if (attempt === retries) {
          throw new Error(`Coingecko API error ${res.status}: ${text}`);
        }
        
        await sleep(250 * Math.pow(2, attempt));
        continue;
      }

      const json = await res.json();
      coingeckoCache.set(url, { data: json, timestamp: Date.now() });
      return json;
      
    } catch (err) {
      console.debug(`[market-data] fetch error on attempt ${attempt + 1}:`, String(err));
      if (attempt === retries) throw err;
      await sleep(250 * Math.pow(2, attempt));
    }
  }
  
  throw new Error(`Failed to fetch after ${retries + 1} attempts`);
}

/**
 * Resolve user-provided token names to CoinGecko ids
 */
async function resolveCoinGeckoIds(inputs: string[]): Promise<Record<string, string | undefined>> {
  const listUrl = "https://api.coingecko.com/api/v3/coins/list";
  const list = (await coingeckoFetchRaw(listUrl)) as Array<{ id: string; symbol: string; name: string }>;
  
  const map: Record<string, string | undefined> = {};
  const byId = new Map<string, string>();
  const bySymbol = new Map<string, string[]>();
  const byName = new Map<string, string>();

  // Build lookup maps
  for (const c of list || []) {
    byId.set(c.id.toLowerCase(), c.id);
    
    const sym = c.symbol?.toLowerCase();
    if (sym) {
      if (!bySymbol.has(sym)) bySymbol.set(sym, []);
      bySymbol.get(sym)!.push(c.id);
    }
    
    const name = c.name?.toLowerCase();
    if (name) {
      byName.set(name, c.id);
    }
  }

  for (const inp of inputs) {
    const raw = inp.trim();
    const normalized = raw.toLowerCase();
    
    // Try exact matches first
    if (byId.has(normalized)) {
      map[inp] = byId.get(normalized);
      continue;
    }

    // Try symbol match
    if (bySymbol.has(normalized)) {
      const ids = bySymbol.get(normalized)!;
      map[inp] = ids[0]; // Take first match
      continue;
    }

    // Try name match
    if (byName.has(normalized)) {
      map[inp] = byName.get(normalized);
      continue;
    }

    // Try partial name matches
    for (const [name, id] of byName.entries()) {
      if (name.includes(normalized) || normalized.includes(name)) {
        map[inp] = id;
        break;
      }
    }

    if (!map[inp]) {
      // Fallback to search API
      try {
        const searchUrl = `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(raw)}`;
        const sres = await coingeckoFetchRaw(searchUrl);
        const coins = (sres && sres.coins) || [];
        
        if (coins.length > 0) {
          // Prioritize exact matches in search results
          const exactMatch = coins.find((coin: any) => 
            coin.name?.toLowerCase() === normalized || 
            coin.symbol?.toLowerCase() === normalized
          );
          
          map[inp] = exactMatch ? exactMatch.id : coins[0].id;
        } else {
          map[inp] = undefined;
        }
      } catch (err) {
        console.debug(`[market-data] Search failed for ${raw}:`, err);
        map[inp] = undefined;
      }
    }
  }
  
  return map;
}

// Market Data Tool
export const marketDataTool = createTool({
  name: "market_data_fetch",
  description: "Fetch real-time market data for cryptocurrency tokens from CoinGecko",
  schema: z.object({
    tokens: z.array(z.string()).describe("Array of token names or symbols to fetch data for"),
  }),
  fn: async ({ tokens }) => {
    const started = new Date().toISOString();
    
    try {
      if (!tokens || tokens.length === 0) {
        return {
          success: false,
          error: "No tokens provided",
          tokens: [],
          source: "coingecko",
          fetched_at: new Date().toISOString(),
          started_at: started,
        };
      }

      // Remove duplicates and empty strings
      const uniqueTokens = [...new Set(tokens.filter(token => token.trim()))];
      
      // Resolve token names/symbols to CoinGecko ids
      const idMap = await resolveCoinGeckoIds(uniqueTokens);
      const marketData: Array<Record<string, any>> = [];

      const foundIds = Object.values(idMap).filter(Boolean) as string[];
      
      if (foundIds.length > 0) {
        const idsParam = encodeURIComponent(foundIds.join(","));
        const endpoint = `https://api.coingecko.com/api/v3/simple/price?ids=${idsParam}&vs_currencies=usd&include_24hr_change=true&include_market_cap=true&include_24hr_vol=true`;
        
        const bulk = await coingeckoFetchRaw(endpoint);

        for (const original of uniqueTokens) {
          const id = idMap[original];
          
          if (id && bulk && bulk[id]) {
            marketData.push({
              token: original,
              id,
              price: bulk[id].usd,
              change_24h: bulk[id].usd_24h_change,
              market_cap: bulk[id].usd_market_cap,
              volume_24h: bulk[id].usd_24h_vol,
              source: "coingecko",
              timestamp: new Date().toISOString(),
            });
          } else if (id) {
            marketData.push({ 
              token: original, 
              id, 
              error: `No price data available for ${id}`, 
              timestamp: new Date().toISOString() 
            });
          } else {
            marketData.push({ 
              token: original, 
              error: `Could not resolve "${original}" to a CoinGecko id`, 
              timestamp: new Date().toISOString() 
            });
          }
        }
      } else {
        for (const original of uniqueTokens) {
          marketData.push({ 
            token: original, 
            error: `Could not resolve "${original}" to a CoinGecko id`, 
            timestamp: new Date().toISOString() 
          });
        }
      }

      return {
        success: true,
        marketData,
        source: "coingecko",
        fetched_at: new Date().toISOString(),
        started_at: started,
      };
    } catch (error) {
      console.error("Market data fetch error:", error);
      
      return {
        success: false,
        error: `Market data fetch failed: ${error instanceof Error ? error.message : String(error)}`,
        tokens,
        source: "coingecko",
        fetched_at: new Date().toISOString(),
        started_at: started,
      };
    }
  },
});