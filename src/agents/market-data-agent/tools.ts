import { createTool } from "@iqai/adk";
import { z } from "zod";
import axios from 'axios';
import { MarketDataTools } from '../../shared/tools/research-tools';
import { TOKEN_ID_MAP } from '../token-market-agent/tools';

const marketDataTools = new MarketDataTools();

export const coinGeckoMarketData = createTool({
  name: "coingecko_market_data",
  description: "Fetches real-time market data from CoinGecko API for specified cryptocurrency tokens",
  schema: z.object({
    tokens: z.array(z.string()).min(1, "At least one token symbol or name is required")
  }),
  fn: async ({ tokens }) => {
    console.debug('[tool:coingecko_market_data] invoked, tokens=', tokens);
    
    try {
      const coinGeckoClient = axios.create({
        baseURL: 'https://api.coingecko.com/api/v3',
        timeout: 10000
      });
      
      const coinIds: string[] = [];
      for (const token of tokens) {
        const tokenLower = token.toLowerCase();
        if (TOKEN_ID_MAP[tokenLower]) {
          coinIds.push(TOKEN_ID_MAP[tokenLower]);
        }
      }
      
      if (coinIds.length === 0) {
        return {
          success: false,
          error: "No matching CoinGecko IDs found for the provided tokens",
          tokens_searched: tokens
        };
      }
      
      const response = await coinGeckoClient.get('/coins/markets', {
        params: {
          vs_currency: 'usd',
          ids: coinIds.join(','),
          order: 'market_cap_desc',
          per_page: 250,
          page: 1,
          sparkline: false,
          price_change_percentage: '24h,7d',
          locale: 'en'
        }
      });

      if (!response.data || response.data.length === 0) {
        return {
          success: false,
          error: "No market data found for the specified tokens",
          tokens_searched: tokens,
          coin_ids_searched: coinIds
        };
      }

      const marketData: Record<string, any> = {};
      response.data.forEach((coin: any) => {
        marketData[coin.id] = {
          id: coin.id,
          symbol: coin.symbol,
          name: coin.name,
          current_price: coin.current_price,
          market_cap: coin.market_cap,
          market_cap_rank: coin.market_cap_rank,
          total_volume: coin.total_volume,
          high_24h: coin.high_24h,
          low_24h: coin.low_24h,
          price_change_24h: coin.price_change_24h,
          price_change_percentage_24h: coin.price_change_percentage_24h,
          price_change_percentage_7d: coin.price_change_percentage_7d_in_currency,
          circulating_supply: coin.circulating_supply,
          total_supply: coin.total_supply,
          max_supply: coin.max_supply,
          ath: coin.ath,
          ath_change_percentage: coin.ath_change_percentage,
          ath_date: coin.ath_date,
          atl: coin.atl,
          atl_change_percentage: coin.atl_change_percentage,
          atl_date: coin.atl_date,
          last_updated: coin.last_updated
        };
      });
      
      const indicatorPromises = Object.keys(marketData).map(async (coinId) => {
        try {
          const ind = await marketDataTools.fetchMarketChartAndIndicators(coinId, 90);
          return { coinId, ind };
        } catch (error) {
          console.warn(`[market-data-agent] Indicators fetch failed for ${coinId}, proceeding without indicators:`, error);
          return { coinId, ind: { success: false, error: 'API_AUTH_ERROR' } };
        }
      });

      const indicatorResults = await Promise.allSettled(indicatorPromises);
      for (const res of indicatorResults) {
        if (res.status === 'fulfilled') {
          const { coinId, ind } = res.value;
          if (ind && ind.success) {
            marketData[coinId].indicators = ind.indicators;
            marketData[coinId].indicators_timestamp = ind.timestamp;
          } else {
            marketData[coinId].indicators = null;
            marketData[coinId].indicators_error = ind?.error || 'unknown';
          }
        }
      }

      return {
        success: true,
        tokens_found: response.data.length,
        market_data: marketData,
        timestamp: new Date().toISOString()
      };
      
    } catch (error: any) {
      console.error('[tool:coingecko_market_data] Error:', error);
      return {
        success: false,
        error: `Failed to fetch market data: ${error.response?.data?.error || error.message || 'Unknown error'}`,
        tokens_searched: tokens,
        status_code: error.response?.status
      };
    }
  },
});

export async function fetchCoinGeckoMarketData(tokens: string[]) {
  try {
    if ((coinGeckoMarketData as any)?.fn && typeof (coinGeckoMarketData as any).fn === 'function') {
      return await (coinGeckoMarketData as any).fn({ tokens });
    }
  } catch (err) {
    console.warn('[helper:fetchCoinGeckoMarketData] coinGeckoMarketData.fn call failed, falling back', err);
  }

  try {
    const coinIds = tokens.map(t => TOKEN_ID_MAP[t.toLowerCase()]).filter(Boolean);
    if (coinIds.length === 0) {
      return { success: false, error: 'No matching CoinGecko IDs for tokens', tokens_searched: tokens };
    }

    const client = axios.create({ baseURL: 'https://api.coingecko.com/api/v3', timeout: 10000 });
    const resp = await client.get('/coins/markets', {
      params: {
        vs_currency: 'usd',
        ids: coinIds.join(','),
        order: 'market_cap_desc',
        per_page: 250,
        page: 1,
        sparkline: false,
        price_change_percentage: '24h,7d',
        locale: 'en'
      }
    });

    const marketData: Record<string, any> = {};
    resp.data.forEach((coin: any) => {
      marketData[coin.id] = {
        id: coin.id,
        symbol: coin.symbol,
        name: coin.name,
        current_price: coin.current_price,
        market_cap: coin.market_cap,
        market_cap_rank: coin.market_cap_rank,
        total_volume: coin.total_volume,
        high_24h: coin.high_24h,
        low_24h: coin.low_24h,
        price_change_24h: coin.price_change_24h,
        price_change_percentage_24h: coin.price_change_percentage_24h,
        price_change_percentage_7d: coin.price_change_percentage_7d_in_currency,
        circulating_supply: coin.circulating_supply,
        total_supply: coin.total_supply,
        max_supply: coin.max_supply,
        ath: coin.ath,
        ath_change_percentage: coin.ath_change_percentage,
        ath_date: coin.ath_date,
        atl: coin.atl,
        atl_change_percentage: coin.atl_change_percentage,
        atl_date: coin.atl_date,
        last_updated: coin.last_updated
      };
    });

    return { success: true, market_data: marketData, coin_ids_searched: coinIds };
  } catch (err) {
    return { success: false, error: String(err), tokens_searched: tokens };
  }
}