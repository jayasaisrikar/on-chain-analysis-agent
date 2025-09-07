export interface MarketData {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  market_cap: number;
  total_volume: number;
  price_change_percentage_24h: number;
  high_24h: number;
  low_24h: number;
  ath?: number;
  ath_date?: string;
  circulating_supply?: number;
  market_cap_rank?: number;
}

export interface SearchResult {
  url: string;
  title: string;
  content: string;
  publishedDate?: string;
  score?: number;
}

export interface ScrapedContent {
  url: string;
  title: string;
  content: string;
  publishedDate?: string;
  timestamp: Date;
}

export interface CryptoAnalysisRequest {
  query: string;
  includeMarketData?: boolean;
  includeResearch?: boolean;
  maxUrls?: number;
  coinSymbols?: string[];
  coinIds?: string[];
}

export interface CryptoAnalysisResponse {
  query: string;
  marketData?: MarketData[];
  researchResults?: SearchResult[];
  scrapedContent?: ScrapedContent[];
  analysis: string;
  timestamp: Date;
}
