import { TavilyClient } from "tavily";
import { Exa } from "exa-js";
import axios from 'axios';
import * as cheerio from 'cheerio';
import { chromium, Browser } from 'playwright';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import { env } from '../../../../env';
import { SearchResult, ScrapedContent } from '../../../../types';

/**
 * Research Service
 * 
 * Provides cryptocurrency research capabilities using search engines and web scraping
 */
export class ResearchService {
  name = "research_service";
  description = "Search for cryptocurrency information and scrape web content for analysis";
  
  private tavilyClient: TavilyClient | null;
  private exaClient: Exa | null;
  private browser?: Browser;

  constructor() {
    this.tavilyClient = env.TAVILY_API_KEY ? new TavilyClient({ apiKey: env.TAVILY_API_KEY }) : null;
    this.exaClient = env.EXA_API_KEY ? new Exa(env.EXA_API_KEY) : null;
  }

  parameters = {
    type: "object",
    properties: {
      action: {
        type: "string",
        enum: ["search", "scrape", "searchAndScrape"],
        description: "The research action to perform"
      },
      query: {
        type: "string",
        description: "Search query for cryptocurrency research"
      },
      urls: {
        type: "array",
        items: { type: "string" },
        description: "Array of URLs to scrape (for scrape action)"
      },
      maxResults: {
        type: "number",
        description: "Maximum number of search results (default: 5)"
      },
      searchEngine: {
        type: "string",
        enum: ["exa", "tavily", "auto"],
        description: "Search engine to use (default: auto)"
      }
    },
    required: ["action"]
  };

  async execute({ action, query, urls, maxResults = 5, searchEngine = "auto" }: {
    action: "search" | "scrape" | "searchAndScrape";
    query?: string;
    urls?: string[];
    maxResults?: number;
    searchEngine?: "exa" | "tavily" | "auto";
  }): Promise<SearchResult[] | ScrapedContent[]> {
    try {
      switch (action) {
        case "search":
          if (!query) throw new Error("Query is required for search action");
          return await this.searchCrypto(query, maxResults, searchEngine);
        
        case "scrape":
          if (!urls || urls.length === 0) throw new Error("URLs are required for scrape action");
          return await this.scrapeUrls(urls);
        
        case "searchAndScrape":
          if (!query) throw new Error("Query is required for searchAndScrape action");
          const searchResults = await this.searchCrypto(query, maxResults, searchEngine);
          const urlsToScrape = searchResults.map(result => result.url);
          const scrapedContent = await this.scrapeUrls(urlsToScrape);
          return scrapedContent;
        
        default:
          throw new Error(`Unknown action: ${action}`);
      }
    } catch (error) {
      console.error(`Research service failed for action ${action}:`, error);
      throw error;
    }
  }

  private async searchCrypto(query: string, maxResults: number, searchEngine: string): Promise<SearchResult[]> {
    console.log(`🔍 Searching for: "${query}"`);
    if (searchEngine === "auto") {
      if (this.exaClient && this.tavilyClient) {
        searchEngine = env.SEARCH_ENGINE === "exa" ? "exa" : "tavily";
      } else if (this.exaClient) {
        searchEngine = "exa";
      } else if (this.tavilyClient) {
        searchEngine = "tavily";
      } else {
        throw new Error("No search engines configured. Please set EXA_API_KEY or TAVILY_API_KEY");
      }
    }

    try {
      if (searchEngine === "exa") {
        return await this.searchWithExa(query, maxResults);
      } else {
        return await this.searchWithTavily(query, maxResults);
      }
    } catch (error) {
      console.error(`Search failed with ${searchEngine}:`, error);
      if (searchEngine === "exa" && this.tavilyClient) {
        console.log("🔄 Falling back to Tavily...");
        return await this.searchWithTavily(query, maxResults);
      } else if (searchEngine === "tavily" && this.exaClient) {
        console.log("🔄 Falling back to Exa...");
        return await this.searchWithExa(query, maxResults);
      }
      throw error;
    }
  }

  private async searchWithExa(query: string, maxResults: number): Promise<SearchResult[]> {
    if (!this.exaClient) {
      throw new Error("Exa API key not configured");
    }

    const result = await this.exaClient.searchAndContents(query, {
      type: "neural" as const,
      numResults: Math.min(maxResults, 10),
      text: { maxCharacters: 1000, includeHtmlTags: false }
    });

    return result.results.map((item: any) => ({
      url: item.url,
      title: item.title || "No title",
      content: item.text || "",
      publishedDate: item.publishedDate,
      score: item.score
    }));
  }

  private async searchWithTavily(query: string, maxResults: number): Promise<SearchResult[]> {
    if (!this.tavilyClient) {
      throw new Error("Tavily API key not configured");
    }

    const result = await this.tavilyClient.search(query);

    return result.results.slice(0, maxResults).map((item: any) => ({
      url: item.url,
      title: item.title || "No title", 
      content: item.content || "",
      publishedDate: item.published_date
    }));
  }

  private async scrapeUrls(urls: string[]): Promise<ScrapedContent[]> {
    console.log(`🌐 Scraping ${urls.length} URLs...`);
    const results: ScrapedContent[] = [];
    
    for (const url of urls.slice(0, 10)) {
      try {
        const result = await this.scrapeUrl(url);
        if (result) {
          results.push(result);
        }
      } catch (error) {
        console.warn(`Failed to scrape ${url}: ${error}`);
      }
      
      // rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log(`✅ Successfully scraped ${results.length} URLs`);
    return results;
  }

  private async scrapeUrl(url: string): Promise<ScrapedContent | null> {
    try {
      const axiosResult = await this.tryAxiosMethod(url);
      if (axiosResult) return axiosResult;
      const playwrightResult = await this.tryPlaywrightMethod(url);
      return playwrightResult;
    } catch (error) {
      console.error(`All methods failed for ${url}: ${error}`);
      return null;
    }
  }

  private async tryAxiosMethod(url: string): Promise<ScrapedContent | null> {
    try {
      const userAgent = this.getRandomUserAgent();
      const response = await axios.get(url, {
        timeout: 15000,
        headers: {
          'User-Agent': userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        }
      });

      const content = this.extractContentWithReadability(response.data, url);
      if (content && content.content.length > 100) {
        return {
          url,
          title: content.title || "No title",
          content: content.content.substring(0, 8000),
          publishedDate: this.extractPublishedDate(response.data),
          timestamp: new Date()
        };
      }

      return null;
    } catch (error) {
      console.warn(`Axios method failed for ${url}:`, error);
      return null;
    }
  }

  private async tryPlaywrightMethod(url: string): Promise<ScrapedContent | null> {
    try {
      if (!this.browser) {
        this.browser = await chromium.launch({
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
      }

      const context = await this.browser.newContext({
        userAgent: this.getRandomUserAgent(),
        viewport: { width: 1920, height: 1080 }
      });

      const page = await context.newPage();
      
      await page.goto(url, { 
        waitUntil: 'domcontentloaded',
        timeout: 15000 
      });

      await page.waitForTimeout(2000);

      const html = await page.content();
      const title = await page.title();
      
      await context.close();

      const content = this.extractContentWithReadability(html, url);
      if (content && content.content.length > 100) {
        return {
          url,
          title: content.title || title || "No title",
          content: content.content.substring(0, 8000),
          publishedDate: this.extractPublishedDate(html),
          timestamp: new Date()
        };
      }

      return null;
    } catch (error) {
      console.warn(`Playwright method failed for ${url}:`, error);
      return null;
    }
  }

  private extractContentWithReadability(html: string, url: string) {
    try {
      const dom = new JSDOM(html, { url });
      const reader = new Readability(dom.window.document);
      const article = reader.parse();
      
      if (article && article.textContent && article.textContent.length > 100) {
        return {
          title: article.title,
          content: article.textContent
        };
      }
      
      return null;
    } catch (error) {
      console.warn('Readability extraction failed:', error);
      return null;
    }
  }

  private extractPublishedDate(html: string): string | undefined {
    try {
      const $ = cheerio.load(html);
      
      const selectors = [
        'meta[property="article:published_time"]',
        'meta[name="publish-date"]',
        'meta[name="date"]',
        'time[datetime]',
        '.published-date',
        '.publish-date',
        '.date'
      ];

      for (const selector of selectors) {
        const element = $(selector).first();
        if (element.length) {
          const dateValue = element.attr('content') || element.attr('datetime') || element.text();
          if (dateValue) {
            const date = new Date(dateValue);
            if (!isNaN(date.getTime())) {
              return date.toISOString();
            }
          }
        }
      }
      
      return undefined;
    } catch (error) {
      return undefined;
    }
  }

  private getRandomUserAgent(): string {
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0'
    ];
    return userAgents[Math.floor(Math.random() * userAgents.length)];
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
      this.browser = undefined;
    }
  }
}
