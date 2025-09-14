import { createTool } from "@iqai/adk";
import { z } from "zod";
import * as cheerio from 'cheerio';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import { chromium } from 'playwright';
import axios from 'axios';
import { MarketDataTools } from '../../shared/tools/research-tools';

const marketDataTools = new MarketDataTools();

interface ExaResult {
  url: string;
  title: string;
  publishedDate: string;
  query: string;
}

interface ScrapedContent {
  url: string;
  title: string;
  content: string;
  publishedDate?: string;
  author?: string;
  length: number;
}

interface ResearchData {
  query: string;
  synonyms: string[];
  searchResults: ExaResult[];
  scrapedContent: ScrapedContent[];
  tokensFound: string[];
  summary: string;
}

export const tavilySearch = createTool({
  name: "tavily_search",
  description: "Searches the web using Tavily API for multiple queries with rate limiting",
  schema: z.object({
    queries: z.array(z.string()),
    numResults: z.number().optional().default(5),
    recentDays: z.number().optional()
  }),
  fn: async ({ queries, numResults, recentDays }) => {
    console.debug('[tool:tavily_search] invoked, queries=', queries.length, 'numResults=', numResults, 'recentDays=', recentDays);
    
    if (!process.env.TAVILY_API_KEY) {
      console.warn('[tool:tavily_search] TAVILY_API_KEY not set - returning mocked results for local development');
      const mockResults = queries.map((q, i) => ({
        url: `https://example.com/mock-${i}`,
        title: `Mock result for: ${q}`,
        publishedDate: new Date().toISOString(),
        query: q
      }));
      return { results: mockResults, total: mockResults.length };
    }

    let TavilyClientImpl: any = null;
    try {
      TavilyClientImpl = (await import('tavily')).TavilyClient;
    } catch (e) {
      console.warn('[tool:tavily_search] failed to dynamically import tavily - returning mocked results', e);
      const mockResults = queries.map((q, i) => ({
        url: `https://example.com/mock-${i}`,
        title: `Mock result for: ${q}`,
        publishedDate: new Date().toISOString(),
        query: q
      }));
      return { results: mockResults, total: mockResults.length };
    }

    const client = new TavilyClientImpl({ apiKey: process.env.TAVILY_API_KEY! });
    const allResults: ExaResult[] = [];

    for (const query of queries) {
      try {
        const response = await client.search({
          query,
          searchDepth: 'basic',
          maxResults: numResults,
          includeAnswer: false,
          includeImages: false
        });

        if (response?.results) {
          const results: ExaResult[] = response.results.map((result: any) => ({
            url: result.url,
            title: result.title,
            publishedDate: result.publishedDate || new Date().toISOString(),
            query: query
          }));
          allResults.push(...results);
        }
      } catch (error) {
        console.error('[tool:tavily_search] Error searching for query:', query, error);
        // Add a fallback result for failed queries
        allResults.push({
          url: `https://error.com/${encodeURIComponent(query)}`,
          title: `Error searching for: ${query}`,
          publishedDate: new Date().toISOString(),
          query: query
        });
      }
    }

    return { results: allResults, total: allResults.length };
  },
});

export const universalScraper = createTool({
  name: "universal_scraper",
  description: "Scrapes content from multiple URLs using various extraction methods",
  schema: z.object({
    urls: z.array(z.string()).min(1, "At least one URL is required")
  }),
  fn: async ({ urls }) => {
    console.debug('[tool:universal_scraper] invoked, urls count=', urls?.length);
    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return { scraped: [], total: 0, error: "No valid URLs provided" };
    }
    
    const scrapeSingleUrl = async (url: string): Promise<ScrapedContent> => {
      try {
        // Skip CloudFlare-protected sites that commonly block scrapers
        const blockedDomains = [
          'investing.com',
          'coinmarketcal.com', 
          'tradingview.com',
          'bloomberg.com',
          'wsj.com'
        ];
        
        if (blockedDomains.some(domain => url.includes(domain))) {
          return {
            url,
            title: 'Skipped - Protected Site',
            content: `Site ${url} is commonly protected by CloudFlare and blocks automated scraping. Consider using search results summary instead.`,
            length: 0
          };
        }

        const response = await axios.get(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          },
          timeout: 15000,
          maxRedirects: 3
        });

        const $ = cheerio.load(response.data);
        const title = $('title').text() || $('h1').first().text() || 'No title';
        
        const dom = new JSDOM(response.data, { url });
        const reader = new Readability(dom.window.document);
        const article = reader.parse();

        const content = article?.textContent || $('body').text() || '';
        
        return {
          url,
          title: title.trim(),
          content: content.trim(),
          length: content.length,
          publishedDate: new Date().toISOString()
        };
      } catch (error) {
        console.error('[tool:universal_scraper] Error scraping URL:', url, error);
        return {
          url,
          title: 'Error',
          content: `Failed to scrape ${url}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          length: 0
        };
      }
    };

    const results = await Promise.allSettled(
      urls.map(url => scrapeSingleUrl(url))
    );
    
    const scrapedContent = results
      .filter((result): result is PromiseFulfilledResult<ScrapedContent> => 
        result.status === 'fulfilled'
      )
      .map(result => result.value);
    
    return { scraped: scrapedContent, total: scrapedContent.length };
  },
});

export const tokenDetector = createTool({
  name: "token_detector",
  description: "Detects cryptocurrency tokens mentioned in queries using pattern matching",
  schema: z.object({
    query: z.string()
  }),
  fn: async ({ query }) => {
    try {
      const patterns = {
        bitcoin: [/bitcoin|btc(?!\w)/i],
        ethereum: [/ethereum|eth(?!\w)/i],
        dogecoin: [/dogecoin|doge(?!\w)/i],
        shiba: [/shiba[\s\-\_]?inu|shib(?!\w)/i],
        iq: [/\biq\s+token\b|\biq(?!\w)/i],
        pear: [/pear\s+protocol\b|\bpear(?!\w)/i],
        cardano: [/cardano|ada(?!\w)/i],
        solana: [/solana|sol(?!\w)/i],
        chainlink: [/chainlink|link(?!\w)/i],
        polygon: [/polygon|matic(?!\w)/i],
        uniswap: [/uniswap|uni(?!\w)/i],
      } as Record<string, RegExp[]>;

      const detected = Object.entries(patterns)
        .filter(([k, pats]) => pats.some(p => p.test(query)))
        .map(([k]) => k);
      
      return {
        tokens: detected,
        patterns: Object.fromEntries(detected.map(k => [k, patterns[k].map(p => p.toString())])),
        query: query
      };
    } catch (error) {
      console.warn('tokenDetector failed, falling back to empty detection', error);
      return { tokens: [], patterns: {}, query: query };
    }
  },
});

export const coinGeckoMarketData = createTool({
  name: "coingecko_market_data",
  description: "Fetches real-time market data from CoinGecko API for specified cryptocurrency tokens",
  schema: z.object({
    tokens: z.array(z.string()).min(1, "At least one token symbol or name is required")
  }),
  fn: async ({ tokens }) => {
    console.debug('[tool:coingecko_market_data] invoked, tokens=', tokens);
    
    try {
      // Create a simple axios client for CoinGecko public API
      const coinGeckoClient = axios.create({
        baseURL: 'https://api.coingecko.com/api/v3',
        timeout: 10000
      });
      
      // Map common token names to CoinGecko IDs
      const tokenIdMap: Record<string, string> = {
        'iq': 'everipedia',
        'pear': 'pear-protocol', 
        'bitcoin': 'bitcoin',
        'ethereum': 'ethereum',
        'btc': 'bitcoin',
        'eth': 'ethereum'
      };
      
      const coinIds: string[] = [];
      for (const token of tokens) {
        const tokenLower = token.toLowerCase();
        if (tokenIdMap[tokenLower]) {
          coinIds.push(tokenIdMap[tokenLower]);
        }
      }
      
      if (coinIds.length === 0) {
        return {
          success: false,
          error: "No matching CoinGecko IDs found for the provided tokens",
          tokens_searched: tokens
        };
      }
      
      // Fetch market data using public API
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
      // Attach basic indicators (RSI, MA, MACD) by fetching market chart data in parallel
      const indicatorPromises = Object.keys(marketData).map(async (coinId) => {
        const ind = await marketDataTools.fetchMarketChartAndIndicators(coinId, 90);
        return { coinId, ind };
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

export const conductResearchTool = createTool({
  name: "conduct_research",
  description: "Provides a structured approach for cryptocurrency research",
  schema: z.object({
    query: z.string(),
    synonyms: z.array(z.string()).optional().default([])
  }),
  fn: async ({ query, synonyms = [] }) => {
    console.debug('[tool:conduct_research] Creating research plan for:', query);
    
    return {
      query,
      synonyms,
      researchPlan: {
        step1: "Use tavily_search to search for cryptocurrency news and data",
        step2: "Use universal_scraper to extract detailed content from search results", 
        step3: "Use token_detector to identify relevant cryptocurrency tokens",
        step4: "Compile and summarize all findings"
      },
      searchQueries: [query, ...synonyms],
      status: 'plan_created',
      recommendation: `Start by searching for: ${[query, ...synonyms].join(', ')}`
    };
  },
});
