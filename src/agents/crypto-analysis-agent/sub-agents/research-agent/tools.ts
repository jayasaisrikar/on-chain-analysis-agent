import { env } from '../../../../env';
import { ScrapedContent as CoreScrapedContent } from '../../../../types';
import { SearchService } from '../../../../services/search';
import { WebScraper } from '../../../../services/scraper';

/**
 * Research Service
 * 
 * Provides cryptocurrency research capabilities using search engines and web scraping
 */
export class ResearchService {
  name = "research_service";
  description = "Search for cryptocurrency information and scrape web content for analysis";

  private searchService: SearchService;
  private scraper: WebScraper;

  constructor() {
    this.searchService = new SearchService();
    this.scraper = new WebScraper();
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
  }): Promise<any[] | CoreScrapedContent[]> {
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

  private async searchCrypto(query: string, maxResults: number, searchEngine: string): Promise<any[]> {
    console.log(`🔍 ResearchAgent searching: "${query}" via ${searchEngine}`);
    let resultAggregate: { urls: string[]; results: any[]; source: string };
    try {
      if (searchEngine === 'exa') {
        resultAggregate = await this.searchService.searchExaOnly([query]);
      } else if (searchEngine === 'tavily') {
        resultAggregate = await this.searchService.searchTavilyOnly([query]);
      } else { // auto / dual
        resultAggregate = await this.searchService.searchDualEngine([query]);
      }
    } catch (e) {
      console.warn(`Primary search (${searchEngine}) failed:`, e);
      if (searchEngine === 'exa') {
        try {
          resultAggregate = await this.searchService.searchTavilyOnly([query]);
        } catch {
          throw e;
        }
      } else if (searchEngine === 'tavily') {
        try {
          resultAggregate = await this.searchService.searchExaOnly([query]);
        } catch {
          throw e;
        }
      } else {
        throw e;
      }
    }
    return resultAggregate.results.slice(0, maxResults).map(r => ({
      url: r.url,
      title: r.title,
      content: (r as any).content || '',
      publishedDate: (r as any).publishedDate,
      score: (r as any).score,
      source: (r as any).score !== undefined ? 'exa' : 'tavily'
    }));
  }

  private async scrapeUrls(urls: string[]): Promise<CoreScrapedContent[]> {
    const scraped = await this.scraper.scrapeMultiple(urls.slice(0, 10));
    return scraped.map(s => ({
      url: s.url,
      title: s.title,
      content: s.cleanedContent || s.content,
      publishedDate: s.publishedDate,
      timestamp: new Date()
    }));
  }

  async cleanup() {
    await this.scraper.cleanup();
  }
}
