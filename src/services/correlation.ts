import axios from 'axios';
import { config } from '../config.js';

export interface HistoricalPrice {
  timestamp: number;
  price: number;
}

export interface CorrelationData {
  asset1: string;
  asset2: string;
  period: '30d' | '90d' | '1y';
  correlation: number;
  priceRatio: number;
  meanPriceRatio: number;
  stdDeviation: number;
  zscore: number;
}

export class CorrelationService {
  async fetchHistoricalPrices(coinId: string, days: number): Promise<HistoricalPrice[]> {
    const apiKey = config.coingecko.apiKey;
    const baseUrl = apiKey 
      ? 'https://pro-api.coingecko.com/api/v3'
      : 'https://api.coingecko.com/api/v3';
    
    const headers = apiKey ? { 'x-cg-pro-api-key': apiKey } : {};
    
    try {
      const response = await axios.get(
        `${baseUrl}/coins/${coinId}/market_chart`,
        {
          params: {
            vs_currency: 'usd',
            days: days,
            interval: 'daily'
          },
          headers
        }
      );
      
      return response.data.prices.map(([timestamp, price]: [number, number]) => ({
        timestamp,
        price
      }));
    } catch (error) {
      console.error(`Failed to fetch historical data for ${coinId}:`, error);
      return [];
    }
  }

  calculateCorrelation(prices1: HistoricalPrice[], prices2: HistoricalPrice[]): number {
    const minLength = Math.min(prices1.length, prices2.length);
    if (minLength < 2) return 0;

    const alignedPrices1 = prices1.slice(-minLength);
    const alignedPrices2 = prices2.slice(-minLength);

    const mean1 = alignedPrices1.reduce((sum, p) => sum + p.price, 0) / minLength;
    const mean2 = alignedPrices2.reduce((sum, p) => sum + p.price, 0) / minLength;

    let numerator = 0;
    let sum1Sq = 0;
    let sum2Sq = 0;

    for (let i = 0; i < minLength; i++) {
      const diff1 = alignedPrices1[i].price - mean1;
      const diff2 = alignedPrices2[i].price - mean2;
      
      numerator += diff1 * diff2;
      sum1Sq += diff1 * diff1;
      sum2Sq += diff2 * diff2;
    }

    const denominator = Math.sqrt(sum1Sq * sum2Sq);
    return denominator === 0 ? 0 : numerator / denominator;
  }

  calculatePairMetrics(prices1: HistoricalPrice[], prices2: HistoricalPrice[]): {
    priceRatio: number;
    meanPriceRatio: number;
    stdDeviation: number;
    zscore: number;
  } {
    const minLength = Math.min(prices1.length, prices2.length);
    if (minLength < 2) return { priceRatio: 0, meanPriceRatio: 0, stdDeviation: 0, zscore: 0 };

    const alignedPrices1 = prices1.slice(-minLength);
    const alignedPrices2 = prices2.slice(-minLength);

    const ratios = alignedPrices1.map((p1, i) => p1.price / alignedPrices2[i].price);
    const currentRatio = ratios[ratios.length - 1];
    const meanRatio = ratios.reduce((sum, r) => sum + r, 0) / ratios.length;
    
    const variance = ratios.reduce((sum, r) => sum + Math.pow(r - meanRatio, 2), 0) / ratios.length;
    const stdDev = Math.sqrt(variance);
    const zscore = stdDev === 0 ? 0 : (currentRatio - meanRatio) / stdDev;

    return {
      priceRatio: currentRatio,
      meanPriceRatio: meanRatio,
      stdDeviation: stdDev,
      zscore: zscore
    };
  }

  async analyzeCorrelation(
    asset1Id: string, 
    asset2Id: string, 
    period: '30d' | '90d' | '1y'
  ): Promise<CorrelationData | null> {
    const days = period === '30d' ? 30 : period === '90d' ? 90 : 365;
    
    const [prices1, prices2] = await Promise.all([
      this.fetchHistoricalPrices(asset1Id, days),
      this.fetchHistoricalPrices(asset2Id, days)
    ]);

    if (prices1.length === 0 || prices2.length === 0) return null;

    const correlation = this.calculateCorrelation(prices1, prices2);
    const pairMetrics = this.calculatePairMetrics(prices1, prices2);

    return {
      asset1: asset1Id,
      asset2: asset2Id,
      period,
      correlation,
      ...pairMetrics
    };
  }
}
