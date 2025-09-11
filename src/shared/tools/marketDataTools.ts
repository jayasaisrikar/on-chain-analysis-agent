import axios, { AxiosInstance } from 'axios';
import { removeStopwords, eng } from 'stopword';
import { config } from "../../config.js";

interface MarketData {
  id: string;
  symbol: string;
  name: string;
  market_cap: number;
  total_volume: number;
  current_price: number;
  price_change_percentage_24h: number;
  high_24h: number;
  low_24h: number;
}

interface DetectedAsset {
  name: string;
  id: string;
  symbol: string;
}

/**
 * Market data tools for cryptocurrency information and token identification
 */
export class MarketDataTools {
  private coinGeckoClient: AxiosInstance;
  private knowledgeBase: Array<{ id: string; symbol: string; name: string }> = [];

  constructor() {
    this.coinGeckoClient = axios.create({
      baseURL: 'https://pro-api.coingecko.com/api/v3',
      headers: { 'x-cg-pro-api-key': config.coingecko?.apiKey }
    });
  }

  /**
   * Fetch filtered market data from CoinGecko API
   */
  private async fetchFilteredMarketData({
    perPage = 250,
    minMarketCap = 1_000_000,
    minVolume = 10_000,
    delayMs = 120
  }: {
    perPage?: number;
    minMarketCap?: number;
    minVolume?: number;
    delayMs?: number;
  } = {}): Promise<MarketData[]> {
    const results: MarketData[] = [];
    let page = 1;

    while (true) {
      await new Promise(r => setTimeout(r, delayMs));

      try {
        const resp = await this.coinGeckoClient.get('/coins/markets', {
          params: {
            vs_currency: 'usd',
            order: 'market_cap_desc',
            per_page: perPage,
            page
          }
        });
        const data: MarketData[] = resp.data;
        if (!Array.isArray(data) || data.length === 0) break;

        const filtered = data.filter(
          c =>
            c.market_cap >= minMarketCap &&
            c.total_volume >= minVolume
        );
        results.push(...filtered);

        if (data.length < perPage) break;
        page++;
      } catch (err: any) {
        if (err.response?.status === 429) {
          console.warn(`Rate limit hit on page ${page}, backing off...`);
          await new Promise(r => setTimeout(r, 1000));
          continue;
        }
        throw err;
      }
    }

    return results;
  }

  /**
   * Get cached knowledge base or fetch fresh data
   */
  async getCachedKnowledgeBase(): Promise<Array<{ id: string; symbol: string; name: string }>> {
    const CACHE_FILE = 'data/cache/knowledge_base_filtered.json';
    const CACHE_TTL = 6 * 30 * 60 * 1000;
    
    const fs = await import('fs/promises');
    
    try {
      const stats = await fs.stat(CACHE_FILE);
      const isExpired = Date.now() - stats.mtime.getTime() > CACHE_TTL;
      
      if (!isExpired) {
        const cached = JSON.parse(await fs.readFile(CACHE_FILE, 'utf8'));
        console.log(`✅ Using cached knowledge base (${cached.length} filtered coins) - Cache age: ${Math.round((Date.now() - stats.mtime.getTime()) / (1000 * 60))} minutes`);
        return cached;
      } else {
        console.log('🔄 Cache expired, fetching fresh data...');
      }
    } catch (error) {
      console.log('📦 No cache found, creating fresh knowledge base...');
    }
    
    const freshData = await this.setupFilteredKnowledgeBase();
    
    try {
      await fs.writeFile(CACHE_FILE, JSON.stringify(freshData, null, 2));
      console.log('💾 Filtered knowledge base cached for future runs');
    } catch (error: any) {
      console.warn('⚠️ Could not cache knowledge base:', error.message);
    }
    
    return freshData;
  }

  /**
   * Setup filtered knowledge base from CoinGecko
   */
  private async setupFilteredKnowledgeBase(): Promise<Array<{ id: string; symbol: string; name: string }>> {
    try {
      console.log("Setting up filtered knowledge base: fetching high-quality CoinGecko assets...");
      
      if (!config.coingecko?.apiKey) {
        throw new Error('❌ COINGECKO_API_KEY environment variable not set.');
      }
      
      console.log("Fetching filtered market data (>$1M market cap, >$10K volume)...");
      const filteredMarketData = await this.fetchFilteredMarketData({ 
        minMarketCap: 1_000_000, 
        minVolume: 10_000 
      });

      console.log(`✅ Retrieved ${filteredMarketData.length} high-quality coins (market cap >= $1M and volume >= $10K)`);

      const filteredCoins = filteredMarketData.map(coin => ({
        id: coin.id,
        symbol: coin.symbol,
        name: coin.name
      }));

      return filteredCoins;
    } catch (error) {
      console.error("❌ Fatal Error: Could not fetch CoinGecko asset list. The application cannot continue.");
      process.exit(1);
    }
  }

  async setupKnowledgeBase(): Promise<void> {
    try {
      this.knowledgeBase = await this.getCachedKnowledgeBase();
      console.log('📦 Knowledge base ready');
    } catch (error) {
      console.error('Failed to setup knowledge base:', error);
      throw error;
    }
  }

  /**
   * Parse token identification response from agent
   */
  parseTokenIdentificationResponse(response: string): DetectedAsset[] | { error: string; suggestions?: DetectedAsset[] } {
    if (response.toLowerCase().includes('no tokens found')) {
      return { 
        error: 'No recognized cryptocurrency tokens found in your query.'
      };
    }

    try {
      const tokens = JSON.parse(response);
      return Array.isArray(tokens) ? tokens : [];
    } catch (parseError) {
      return { error: 'Failed to parse token identification response' };
    }
  }

  async fetchDetailedCoinData(detectedAssets: DetectedAsset[]): Promise<Record<string, any>> {
    if (!detectedAssets.length) return {};

    try {
      const coinIds = detectedAssets.map(asset => asset.id).join(',');
      
      const response = await this.coinGeckoClient.get('/coins/markets', {
        params: {
          vs_currency: 'usd',
          ids: coinIds,
          order: 'market_cap_desc',
          per_page: 250,
          page: 1,
          sparkline: false,
          price_change_percentage: '24h',
          locale: 'en'
        }
      });

      const result: Record<string, any> = {};
      response.data.forEach((coin: any) => {
        result[coin.id] = coin;
      });

      console.log(`💰 Retrieved market data for ${Object.keys(result).length} coins`);
      return result;
    } catch (error) {
      console.error('Failed to fetch market data:', error);
      return {};
    }
  }

  /**
   * Get cryptocurrency token suggestions based on partial query matches
   */
  async getSuggestions(query: string): Promise<DetectedAsset[]> {
    const knowledgeBase = this.knowledgeBase.length > 0 ? this.knowledgeBase : await this.getCachedKnowledgeBase();
    const queryWords = removeStopwords(query.toLowerCase().split(/\s+/), eng);
    const suggestions: DetectedAsset[] = [];

    for (const coin of knowledgeBase.slice(0, 100)) {
      const coinName = coin.name.toLowerCase();
      const coinSymbol = coin.symbol.toLowerCase();
      
      for (const word of queryWords) {
        if (word.length > 2 && (coinName.includes(word) || coinSymbol.includes(word))) {
          suggestions.push({
            name: coin.name,
            id: coin.id,
            symbol: coin.symbol.toUpperCase()
          });
          break;
        }
      }
      
      if (suggestions.length >= 5) break;
    }

    return suggestions;
  }
}
