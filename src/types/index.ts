export interface Timer {
  elapsed(): number;
  checkpoint(): void;
  end(): number;
}

export interface QueryValidationResult {
  isValid: boolean;
  sanitizedQuery: string;
}

export interface SynonymResponse {
  synonyms: string[];
  originalQuery: string;
}

export interface ScrapedContent {
  url: string;
  title: string;
  content: string;
  cleanedContent: string;
  publishedDate?: string;
  metadata: {
    relevanceScore: number;
    wordCount: number;
    source: string;
  };
}

export interface SearchResultItem {
  url: string;
  title: string;
  publishedDate?: string;
  query?: string;
  source: 'exa' | 'tavily';
  score?: number;
  snippet?: string;
}

export interface ExaResult {
  url: string;
  title: string;
  publishedDate?: string;
  query?: string;
}

export interface TavilyResult {
  url: string;
  title: string;
  published_date?: string;
  query?: string;
  score?: number;
  content?: string;
}

export interface SearchResult {
  urls: string[];
  results: SearchResultItem[];
}

export interface SearchEngineComparison {
  exa: {
    totalResults: number;
    avgFreshness: number;
    uniqueUrls: number;
    avgRelevanceScore: number;
    executionTime: number;
    errors: number;
  };
  tavily: {
    totalResults: number;
    avgFreshness: number;
    uniqueUrls: number;
    avgRelevanceScore: number;
    executionTime: number;
    errors: number;
  };
  combined: {
    totalUniqueUrls: number;
    overlapPercentage: number;
    qualityScore: number;
    recommendedEngine: 'exa' | 'tavily' | 'both';
    reasoning: string;
  };
}

export interface MarketData {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  market_cap: number;
  market_cap_rank?: number;
  fully_diluted_valuation?: number;
  total_volume: number;
  high_24h: number;
  low_24h: number;
  price_change_24h?: number;
  price_change_percentage_24h: number;
  price_change_percentage_7d?: number;
  price_change_percentage_30d?: number;
  market_cap_change_24h?: number;
  market_cap_change_percentage_24h?: number;
  circulating_supply?: number;
  total_supply?: number;
  max_supply?: number;
  ath?: number;
  ath_change_percentage?: number;
  ath_date?: string;
  atl?: number;
  atl_change_percentage?: number;
  atl_date?: string;
  last_updated?: string;
}

export interface CoinInfo {
  id: string;
  symbol: string;
  name: string;
}

export interface DetectedAsset {
  name: string;
  id: string;
  symbol: string;
}

export interface TokenCoverage {
  [tokenName: string]: number;
}

export interface AugmentedCoinData {
  name: string;
  symbol: string;
  current_price: number;
  market_cap: number;
  price_change_24h: number;
  high_24h: number;
  low_24h: number;
}

export interface KnowledgeBaseIndex {
  symbolMap: Map<string, CoinInfo>;
  nameMap: Map<string, CoinInfo>;
}
