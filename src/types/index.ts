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
  market_cap: number;
  total_volume: number;
  current_price: number;
  price_change_percentage_24h: number;
  high_24h: number;
  low_24h: number;
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

export interface MemoryData {
  [key: string]: any;
}

export interface ScrapingMethod {
  name: string;
  execute: (url: string) => Promise<{ content: string; html: string }>;
}

export interface RateLimitOptions {
  batchSize: number;
  minDelayMs: number;
  maxRetries: number;
}

export interface ScrapingConfig {
  maxConcurrent: number;
  timeout: number;
  maxRetries: number;
  skipSlowMethods: boolean;
  skipProblematicDomains: string[];
  fastMethods: string[];
}

export interface PairSignal {
  id: string;
  timestamp: string;
  longAsset: AssetInfo;
  shortAsset: AssetInfo;
  signalType: 'mean_reversion' | 'correlation_breakdown' | 'fundamental_divergence';
  confidence: number;
  expectedDuration: '1d' | '1w' | '1m';
  entryRatio: number;
  targetRatio: number;
  stopLossRatio: number;
  reasoning: string;
  historicalCorrelation: number;
  currentCorrelation: number;
  fundamentalCatalysts: string[];
}

export interface AssetInfo {
  id: string;
  symbol: string;
  name: string;
  currentPrice: number;
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

export interface HistoricalPrice {
  timestamp: number;
  price: number;
}
