import { getCachedKnowledgeBase, fetchDetailedCoinData } from '../../../../services/market-data';
import { MarketData } from '../../../../types';

interface KBEntry { id: string; symbol: string; name: string }

/**
 * Adapter Market Data Service
 *
 * Delegates to the centralized `src/services/market-data.ts` functions to avoid duplicating
 * CoinGecko logic in the agent sub-folder. Provides the same `execute` interface expected by
 * the agent wrapper.
 */
export class MarketDataService {
  name = 'market_data_service';
  description = 'Get real-time cryptocurrency market data including prices, market cap, volume, and other metrics';

  parameters = {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: ['getMarketData', 'getTopCoins', 'convertSymbols'],
        description: 'The action to perform'
      },
      coinIds: {
        type: 'array',
        items: { type: 'string' },
        description: "Array of CoinGecko coin IDs (e.g., ['bitcoin', 'ethereum'])"
      },
      symbols: {
        type: 'array',
        items: { type: 'string' },
        description: "Array of coin symbols (e.g., ['BTC', 'ETH']) - will be converted to IDs"
      },
      topCount: {
        type: 'number',
        description: 'Number of top coins to fetch by market cap (for getTopCoins action)'
      }
    },
    required: ['action']
  };

  async execute({ action, coinIds, symbols, topCount }: {
    action: 'getMarketData' | 'getTopCoins' | 'convertSymbols';
    coinIds?: string[];
    symbols?: string[];
    topCount?: number;
  }): Promise<MarketData[] | string[]> {
    switch (action) {
      case 'getTopCoins': {
        const kb: KBEntry[] = await getCachedKnowledgeBase();
        const count = topCount || 10;
        const top = kb.slice(0, count);
        const assets = top.map((a: KBEntry) => ({ id: a.id, name: a.name }));
        return await fetchDetailedCoinData(assets);
      }

      case 'convertSymbols': {
        if (!symbols || symbols.length === 0) return [];
        const kb: KBEntry[] = await getCachedKnowledgeBase();
        const ids: string[] = [];
        for (const s of symbols) {
          const found = kb.find((k: KBEntry) => k.symbol.toLowerCase() === s.toLowerCase() || k.name.toLowerCase() === s.toLowerCase());
          if (found) ids.push(found.id);
        }
        return ids;
      }

      case 'getMarketData':
      default: {
        let finalIds: string[] = [];
        if (symbols && symbols.length > 0) {
          const converted = await this.execute({ action: 'convertSymbols', symbols });
          if (Array.isArray(converted)) finalIds = [...finalIds, ...converted as string[]];
        }
        if (coinIds && coinIds.length > 0) finalIds = [...finalIds, ...coinIds];
        finalIds = [...new Set(finalIds)];

        if (finalIds.length === 0) throw new Error('Please provide coinIds or symbols parameter');

        const kb: KBEntry[] = await getCachedKnowledgeBase();
        const assets = finalIds.map(id => {
          const found = kb.find((k: KBEntry) => k.id === id);
          return { id, name: found?.name || id };
        });
        return await fetchDetailedCoinData(assets);
      }
    }
  }
}
