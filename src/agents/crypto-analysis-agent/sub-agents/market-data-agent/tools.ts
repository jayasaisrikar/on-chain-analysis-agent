import axios, { AxiosInstance } from 'axios';
import { env } from '../../../../env';
import { MarketData } from '../../../../types';

/**
 * Market Data Service
 * 
 * Provides cryptocurrency market data using CoinGecko API
 */
export class MarketDataService {
  name = "market_data_service";
  description = "Get real-time cryptocurrency market data including prices, market cap, volume, and other metrics";
  
  private client: AxiosInstance;

  constructor() {
    const baseURL = env.COINGECKO_API_KEY 
      ? 'https://pro-api.coingecko.com/api/v3'
      : 'https://api.coingecko.com/api/v3';
    
    this.client = axios.create({
      baseURL,
      headers: env.COINGECKO_API_KEY ? {
        'x-cg-pro-api-key': env.COINGECKO_API_KEY
      } : {}
    });
  }

  parameters = {
    type: "object",
    properties: {
      action: {
        type: "string",
        enum: ["getMarketData", "getTopCoins", "convertSymbols"],
        description: "The action to perform"
      },
      coinIds: {
        type: "array",
        items: { type: "string" },
        description: "Array of CoinGecko coin IDs (e.g., ['bitcoin', 'ethereum'])"
      },
      symbols: {
        type: "array", 
        items: { type: "string" },
        description: "Array of coin symbols (e.g., ['BTC', 'ETH']) - will be converted to IDs"
      },
      topCount: {
        type: "number",
        description: "Number of top coins to fetch by market cap (for getTopCoins action)"
      }
    },
    required: ["action"]
  };

  async execute({ action, coinIds, symbols, topCount }: {
    action: "getMarketData" | "getTopCoins" | "convertSymbols";
    coinIds?: string[];
    symbols?: string[];
    topCount?: number;
  }): Promise<MarketData[] | string[]> {
    try {
      switch (action) {
        case "getTopCoins":
          return await this.getTopCoins(topCount || 10);
        
        case "convertSymbols":
          if (!symbols || symbols.length === 0) {
            throw new Error("Symbols array is required for convertSymbols action");
          }
          return await this.convertSymbolsToIds(symbols);
        
        case "getMarketData":
        default:
          let finalCoinIds: string[] = [];

          if (symbols && symbols.length > 0) {
            console.log(`🔍 Converting symbols to coin IDs: ${symbols.join(', ')}`);
            finalCoinIds = await this.convertSymbolsToIds(symbols);
          }

          if (coinIds && coinIds.length > 0) {
            finalCoinIds = [...finalCoinIds, ...coinIds];
          }

          if (finalCoinIds.length === 0) {
            throw new Error("Please provide coinIds or symbols parameter");
          }

          // removing duplicates
          finalCoinIds = [...new Set(finalCoinIds)];
          
          console.log(`📊 Fetching market data for: ${finalCoinIds.join(', ')}`);
          return await this.getMarketData(finalCoinIds);
      }
    } catch (error) {
      console.error('Market data fetch failed:', error);
      throw error;
    }
  }

  private async getTopCoins(limit: number): Promise<MarketData[]> {
    console.log(`📊 Fetching top ${limit} cryptocurrencies...`);
    
    const response = await this.client.get('/coins/markets', {
      params: {
        vs_currency: 'usd',
        order: 'market_cap_desc',
        per_page: Math.min(limit, 100),
        page: 1,
        sparkline: false
      }
    });

    return response.data.map(this.formatCoinData);
  }

  private async getMarketData(coinIds: string[]): Promise<MarketData[]> {
    const chunks = this.chunkArray(coinIds, 100);
    const allData: MarketData[] = [];

    for (const chunk of chunks) {
      const response = await this.client.get('/coins/markets', {
        params: {
          vs_currency: 'usd',
          ids: chunk.join(','),
          order: 'market_cap_desc',
          sparkline: false
        }
      });

      allData.push(...response.data.map(this.formatCoinData));
      
      // rate limiting
      if (chunks.length > 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return allData;
  }

  private async convertSymbolsToIds(symbols: string[]): Promise<string[]> {
    try {
      const response = await this.client.get('/coins/list');
      const coinsList = response.data;
      
      const coinIds: string[] = [];
      
      for (const symbol of symbols) {
        const coin = coinsList.find((c: any) => 
          c.symbol.toLowerCase() === symbol.toLowerCase()
        );
        
        if (coin) {
          coinIds.push(coin.id);
          console.log(`✅ Found ${symbol.toUpperCase()} -> ${coin.id}`);
        } else {
          console.warn(`⚠️ Could not find coin ID for symbol: ${symbol}`);
        }
      }
      
      return coinIds;
    } catch (error) {
      console.error('Failed to convert symbols to IDs:', error);
      return [];
    }
  }

  private formatCoinData(coin: any): MarketData {
    return {
      id: coin.id,
      symbol: coin.symbol,
      name: coin.name,
      current_price: coin.current_price,
      market_cap: coin.market_cap,
      total_volume: coin.total_volume,
      price_change_percentage_24h: coin.price_change_percentage_24h,
      high_24h: coin.high_24h,
      low_24h: coin.low_24h,
      ath: coin.ath,
      ath_date: coin.ath_date,
      circulating_supply: coin.circulating_supply,
      market_cap_rank: coin.market_cap_rank
    };
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}
