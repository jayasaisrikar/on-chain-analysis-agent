import axios, { AxiosInstance } from 'axios';
import { removeStopwords, eng } from 'stopword';

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
      headers: { 'x-cg-pro-api-key': process.env.COINGECKO_API_KEY }
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
    const REL_CACHE_DIR = 'data/cache';
    const CACHE_FILE_NAME = 'knowledge_base_filtered.json';
    const CACHE_TTL = 6 * 30 * 60 * 1000;

    const path = await import('path');
    const fs = await import('fs/promises');

    const cacheDir = path.join(process.cwd(), REL_CACHE_DIR);
    const cacheFile = path.join(cacheDir, CACHE_FILE_NAME);

    try {
      // Ensure cache directory exists before attempting to stat/read
      await fs.mkdir(cacheDir, { recursive: true });

      const stats = await fs.stat(cacheFile);
      const isExpired = Date.now() - stats.mtime.getTime() > CACHE_TTL;

      if (!isExpired) {
        const cached = JSON.parse(await fs.readFile(cacheFile, 'utf8'));
        console.log(`✅ Using cached knowledge base (${cached.length} filtered coins) - Cache age: ${Math.round((Date.now() - stats.mtime.getTime()) / (1000 * 60))} minutes`);
        return cached;
      } else {
        console.log('🔄 Cache expired, fetching fresh data...');
      }
    } catch (error: any) {
      if (error && (error.code === 'ENOENT' || error.code === 'ENOTDIR')) {
        console.log('📦 No cache found, creating fresh knowledge base...');
      } else {
        console.warn('⚠️ Error while accessing cache (will attempt to refresh):', error.message || error);
      }
    }

    const freshData = await this.setupFilteredKnowledgeBase();

    try {
      await fs.writeFile(cacheFile, JSON.stringify(freshData, null, 2));
      console.log('💾 Filtered knowledge base cached for future runs');
    } catch (error: any) {
      console.warn('⚠️ Could not cache knowledge base:', error.message || error);
    }

    return freshData;
  }

  /**
   * Setup filtered knowledge base from CoinGecko
   */
  private async setupFilteredKnowledgeBase(): Promise<Array<{ id: string; symbol: string; name: string }>> {
    try {
      console.log("Setting up filtered knowledge base: fetching high-quality CoinGecko assets...");
      
      if (!process.env.COINGECKO_API_KEY) {
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

  private sma(values: number[], period: number): number | null {
    if (!values || values.length < period) return null;
    const slice = values.slice(values.length - period);
    const sum = slice.reduce((s, v) => s + v, 0);
    return sum / period;
  }

  private emaSeries(values: number[], period: number): number[] {
    const out: number[] = [];
    const k = 2 / (period + 1);
    if (values.length < period) return out;
    let emaPrev = values.slice(0, period).reduce((s, v) => s + v, 0) / period;
    out.push(emaPrev);
    for (let i = period; i < values.length; i++) {
      emaPrev = values[i] * k + emaPrev * (1 - k);
      out.push(emaPrev);
    }
    return out;
  }

  private computeRSI(values: number[], period = 14): number | null {
    if (!values || values.length < period + 1) return null;
    let gains = 0;
    let losses = 0;
    for (let i = values.length - period - 1; i < values.length - 1; i++) {
      const change = values[i + 1] - values[i];
      if (change > 0) gains += change;
      else losses += Math.abs(change);
    }
    const avgGain = gains / period;
    const avgLoss = losses / period;
    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - 100 / (1 + rs);
  }

  private computeMACD(values: number[], fast = 12, slow = 26, signal = 9) {
    if (!values || values.length < slow) return null;
    const emaFastSeries = this.emaSeries(values, fast);
    const emaSlowSeries = this.emaSeries(values, slow);
    const macdSeries: number[] = [];
    const offset = slow - fast; // could be negative
    for (let i = 0; i < emaSlowSeries.length; i++) {
      const fastIdx = i + offset;
      if (fastIdx >= 0 && fastIdx < emaFastSeries.length) {
        macdSeries.push(emaFastSeries[fastIdx] - emaSlowSeries[i]);
      }
    }
    if (macdSeries.length < signal) return null;
    const signalSeries = this.emaSeries(macdSeries, signal);
    const macd = macdSeries[macdSeries.length - 1];
    const signalLine = signalSeries[signalSeries.length - 1];
    return { macd, signal: signalLine, hist: macd - signalLine };
  }

  /**
   * Fetch recent market chart (daily) and compute common indicators (RSI14, MA20/50/200, MACD)
   */
  async fetchMarketChartAndIndicators(coinId: string, days = 90) {
    try {
      const resp = await this.coinGeckoClient.get(`/coins/${coinId}/market_chart`, {
        params: { vs_currency: 'usd', days, interval: 'daily' }
      });
      const prices: number[] = (resp.data?.prices || []).map((p: any[]) => p[1]);
      const indicators: any = {
        sample_count: prices.length,
        latest_price: prices.length ? prices[prices.length - 1] : null,
        rsi_14: this.computeRSI(prices, 14),
        ma_20: this.sma(prices, 20),
        ma_50: this.sma(prices, 50),
        ma_200: this.sma(prices, 200),
        macd: this.computeMACD(prices, 12, 26, 9)
      };
      return { success: true, indicators, timestamp: new Date().toISOString() };
    } catch (err) {
      const error: any = err;
      console.warn(`Failed to fetch chart/indicators for ${coinId}:`, error?.message || error);
      return { success: false, error: error?.message || 'Failed to fetch chart' };
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
