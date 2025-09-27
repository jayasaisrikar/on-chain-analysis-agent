import { NextRequest } from 'next/server';

export const runtime = 'nodejs';

// Proxy for crypto prices (USD) using ONLY CoinGecko now.
// Query param: `symbols` comma-separated (e.g. BTC,ETH,SOL)
// In-memory cache (ephemeral per serverless instance) keyed by sorted symbols string.
type CacheEntry = { ts: number; data: Record<string, any> };
const CACHE = new Map<string, CacheEntry>();

// Dynamic CoinGecko coins list cache (refreshed every 24 hours)
type CoinInfo = { id: string; symbol: string; name: string };
type CoinsListCache = { data: CoinInfo[]; timestamp: number };
let COINS_LIST_CACHE: CoinsListCache | null = null;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// Fallback mapping for common symbols (used if coins list fetch fails)
const FALLBACK_ID_MAP: Record<string, string> = {
  BTC: 'bitcoin', ETH: 'ethereum', SOL: 'solana', ADA: 'cardano', DOGE: 'dogecoin', DOT: 'polkadot', XRP: 'ripple',
  LTC: 'litecoin', LINK: 'chainlink', CHAINLINK: 'chainlink', BNB: 'binancecoin', MATIC: 'matic-network', ARB: 'arbitrum', ARBITRUM: 'arbitrum',
  OP: 'optimism', POLYGON: 'matic-network', USDT: 'tether', USDC: 'usd-coin', DAI: 'dai', AVAX: 'avalanche-2',
  ATOM: 'cosmos', UNI: 'uniswap', AAVE: 'aave', MKR: 'maker', COMP: 'compound-governance-token', SNX: 'havven',
  CRV: 'curve-dao-token', SUSHI: 'sushi', YFI: 'yearn-finance'
};

/**
 * Fetch the complete list of cryptocurrencies from CoinGecko
 */
async function fetchCoinsList(): Promise<CoinInfo[]> {
  const url = 'https://api.coingecko.com/api/v3/coins/list';
  console.log('[market-data] Fetching complete coins list from CoinGecko...');
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const data = await response.json();
    console.log(`[market-data] Successfully loaded ${data.length} cryptocurrencies`);
    return data;
  } catch (error) {
    console.error('[market-data] Failed to fetch coins list:', error);
    throw error;
  }
}

/**
 * Get cached coins list or fetch fresh data if needed
 */
async function getCachedCoinsList(): Promise<CoinInfo[]> {
  const now = Date.now();
  
  // Check if cache exists and is still valid
  if (COINS_LIST_CACHE && (now - COINS_LIST_CACHE.timestamp) < CACHE_TTL_MS) {
    console.log('[market-data] Using cached coins list');
    return COINS_LIST_CACHE.data;
  }
  
  // Fetch fresh data
  try {
    const data = await fetchCoinsList();
    COINS_LIST_CACHE = { data, timestamp: now };
    return data;
  } catch (error) {
    // If fetch fails and we have expired cache, use it anyway
    if (COINS_LIST_CACHE) {
      console.log('[market-data] Using expired cache due to fetch failure');
      return COINS_LIST_CACHE.data;
    }
    throw error;
  }
}

/**
 * Resolve cryptocurrency symbols to CoinGecko IDs dynamically
 */
async function resolveCoinGeckoIds(symbols: string[]): Promise<Record<string, string>> {
  const symbolToId: Record<string, string> = {};
  
  try {
    const coinsList = await getCachedCoinsList();
    
    // Build lookup maps for efficient searching
    const bySymbol = new Map<string, string[]>();
    const byName = new Map<string, string>();
    
    for (const coin of coinsList) {
      // Map by symbol (can have duplicates)
      const symbol = coin.symbol?.toLowerCase();
      if (symbol) {
        if (!bySymbol.has(symbol)) {
          bySymbol.set(symbol, []);
        }
        bySymbol.get(symbol)!.push(coin.id);
      }
      
      // Map by name (prefer first match)
      const name = coin.name?.toLowerCase();
      if (name && !byName.has(name)) {
        byName.set(name, coin.id);
      }
    }
    
    // Resolve each symbol
    for (const symbol of symbols) {
      const lower = symbol.toLowerCase();
      
      // First try exact symbol match
      const symbolMatches = bySymbol.get(lower);
      if (symbolMatches && symbolMatches.length > 0) {
        // Prefer first match (usually most popular)
        symbolToId[symbol] = symbolMatches[0];
        continue;
      }
      
      // Then try name match
      const nameMatch = byName.get(lower);
      if (nameMatch) {
        symbolToId[symbol] = nameMatch;
        continue;
      }
      
      // Finally try partial name matching
      let found = false;
      for (const [name, id] of byName.entries()) {
        if (name.includes(lower) || lower.includes(name)) {
          symbolToId[symbol] = id;
          found = true;
          break;
        }
      }
      
      if (!found) {
        console.log(`[market-data] No CoinGecko ID found for: ${symbol}`);
      }
    }
    
    console.log(`[market-data] Resolved ${Object.keys(symbolToId).length}/${symbols.length} symbols`);
    return symbolToId;
    
  } catch (error) {
    console.error('[market-data] Dynamic resolution failed, using fallback mapping:', error);
    
    // Fallback to static mapping
    for (const symbol of symbols) {
      const id = FALLBACK_ID_MAP[symbol.toUpperCase()];
      if (id) {
        symbolToId[symbol] = id;
      }
    }
    
    return symbolToId;
  }
}

export async function GET(req: NextRequest): Promise<Response> {
  const url = new URL(req.url);
  const symbolsParam = url.searchParams.get('symbols') || '';
  const symbols = symbolsParam.split(',').map(s => s.trim()).filter(Boolean).slice(0, 30); // allow up to 30 for CG batch

  // TTL for cache in seconds (default 60s). Accept legacy env name for backward compat.
  const ttlSec = Number(process.env.COINAPI_CACHE_TTL ?? process.env.PRICES_CACHE_TTL ?? 60);
  const cacheKey = symbols.map(s => s.toUpperCase()).sort().join(',');
  const now = Date.now();
  const cached = CACHE.get(cacheKey);
  if (cached && (now - cached.ts) < ttlSec * 1000) {
    return json({ success: true, data: cached.data, cached: true, cached_at: new Date(cached.ts).toISOString(), source: 'coingecko' });
  }

  const results: Record<string, any> = {};
  const fetchMeta = await fetchFromCoinGecko(symbols, results);

  // Cache result set regardless (client can handle errors per symbol)
  try { CACHE.set(cacheKey, { ts: Date.now(), data: results }); } catch { /* ignore */ }

  // If upstream failed entirely, still respond 200 so client UI can show placeholders instead of hard error
  if (!fetchMeta.ok) {
    return json({ success: false, error: fetchMeta.error, status: fetchMeta.status, data: results, source: 'coingecko' });
  }

  return json({ success: true, data: results, cached: false, source: 'coingecko' });
}

async function fetchFromCoinGecko(symbols: string[], results: Record<string, any>): Promise<{ ok: boolean; status?: number; error?: string }> {
  if (!symbols.length) return { ok: true };

  // Sanitize key: treat empty, placeholder, or short values as missing
  const rawKey = process.env.COINGECKO_API_KEY;
  const COINGECKO_KEY = rawKey && rawKey.trim().length > 10 && !/^(your|placeholder|changeme)/i.test(rawKey.trim())
    ? rawKey.trim()
    : undefined; // optional
  const symbolToId: Record<string, string> = {};
  const ids: string[] = [];

  // Use dynamic resolution instead of hardcoded mapping
  try {
    const resolvedIds = await resolveCoinGeckoIds(symbols);
    for (const sym of symbols) {
      const id = resolvedIds[sym];
      if (id) { 
        symbolToId[sym.toUpperCase()] = id; 
        ids.push(id); 
      } else {
        results[sym] = { error: 'Cryptocurrency not found', symbol: sym };
      }
    }
  } catch (error) {
    console.error('[market-data] Symbol resolution failed:', error);
    for (const sym of symbols) {
      results[sym] = { error: 'Symbol resolution failed', symbol: sym };
    }
    return { ok: false, error: 'Symbol resolution failed' };
  }

  // Deduplicate IDs
  const uniqueIds = Array.from(new Set(ids));
  if (!uniqueIds.length) return { ok: true };

  let usedPro = Boolean(COINGECKO_KEY);
  let attempt = 0;
  let data: any = {};
  let lastStatus: number | undefined;
  let lastError: string | undefined;
  
  while (attempt < 2) { // at most one retry (pro -> public)
    const baseUrl = (usedPro ? 'https://pro-api.coingecko.com/api/v3' : 'https://api.coingecko.com/api/v3');
    const urlStr = `${baseUrl}/simple/price?ids=${encodeURIComponent(uniqueIds.join(','))}&vs_currencies=usd&include_24hr_change=true&include_market_cap=true&include_24hr_vol=true${usedPro ? `&x_cg_pro_api_key=${COINGECKO_KEY}` : ''}`;
    const headers: HeadersInit = {};
    
    console.log(`[market-data] Fetch attempt ${attempt + 1} -> ${urlStr}`);
    let resp: Response;
    try {
      resp = await fetch(urlStr, { headers });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('CoinGecko network error attempt', attempt + 1, msg);
      lastError = msg;
      lastStatus = 0;
      if (usedPro) {
        // fallback to public on network errors too
        usedPro = false;
        attempt++;
        continue;
      }
      break;
    }
    lastStatus = resp.status;
    if (!resp.ok) {
      let text: string;
      try { text = await resp.text(); } catch { text = ''; }
      lastError = text.slice(0, 300);
      console.log(`[market-data] non-ok response ${resp.status} ${lastError}`);
      
      // Auth issues -> retry with public endpoint
      if (usedPro && (resp.status === 401 || resp.status === 403 || /API Key Missing|error_code\":?\s*1000?2/i.test(lastError))) {
        console.log(`[market-data] pro-api error ${resp.status}; attempting public API fallback`);
        usedPro = false; // downgrade
        attempt++;
        continue;
      }
      // Rate limit on pro? optionally fallback (if 429)
      if (usedPro && resp.status === 429) {
        console.log(`[market-data] rate limit on pro-api; attempting public API fallback`);
        usedPro = false;
        attempt++;
        continue;
      }
      break; // no retry conditions met
    }
    try {
      data = await resp.json();
    } catch (e) {
      console.error('CoinGecko JSON parse error', e);
      lastError = 'json parse error';
      if (usedPro) { usedPro = false; attempt++; continue; }
      break;
    }
    // success path -> exit loop
    lastError = undefined;
    break;
  }
  if (!data || Object.keys(data).length === 0 && lastError) {
    for (const sym of symbols) {
      if (!results[sym]) results[sym] = { symbol: sym, error: lastError || `upstream ${lastStatus}`, source: 'coingecko' };
    }
    return { ok: false, status: lastStatus, error: lastError };
  }

  for (const sym of symbols) {
    const up = sym.toUpperCase();
    const id = symbolToId[up];
    if (!id) continue;
    const entry = data[id];
    if (entry && typeof entry.usd === 'number') {
      const lastUpdated = entry.last_updated_at ? new Date(entry.last_updated_at * 1000).toISOString() : new Date().toISOString();
      results[sym] = { symbol: sym, price: entry.usd, time: lastUpdated, source: 'coingecko', raw: entry };
    } else {
      results[sym] = { symbol: sym, error: 'No price data', source: 'coingecko' };
    }
  }
  return { ok: true };
}

// Small helper to build JSON responses consistently
function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}