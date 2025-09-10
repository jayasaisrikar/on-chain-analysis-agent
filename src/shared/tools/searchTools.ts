import { TavilyClient } from "tavily";
import { Exa } from "exa-js";
import { config } from "../../config.js";

interface TavilyResult {
  url: string;
  title: string;
  content: string;
  publishedDate?: string;
}

interface ExaResult {
  url: string;
  title: string;
  content?: string;
  publishedDate?: string;
  score?: number;
}

interface SearchResult {
  urls: string[];
  results: Array<TavilyResult | ExaResult>;
  source: 'exa' | 'tavily' | 'combined';
}

/**
 * Search tools for cryptocurrency research using Exa and Tavily APIs
 */
export class SearchTools {
  private tavilyClient: TavilyClient | null;
  private exaClient: Exa | null;

  constructor() {
    this.tavilyClient = config.tavily?.apiKey ? new TavilyClient({ apiKey: config.tavily.apiKey }) : null;
    this.exaClient = config.exa?.apiKey ? new Exa(config.exa.apiKey) : null;
  }

  async searchExaOnly(queries: string[]): Promise<SearchResult> {
    if (!this.exaClient) {
      throw new Error("Exa API key not configured");
    }

    console.log(`🔍 Searching with Exa (${queries.length} queries)`);
    const allResults: ExaResult[] = [];

    for (const query of queries.slice(0, 3)) {
      try {
        const result = await this.exaClient.searchAndContents(query, {
          type: "neural" as const,
          numResults: 3,
          text: { maxCharacters: 1000, includeHtmlTags: false }
        });

        allResults.push(...result.results.map(r => ({
          url: r.url,
          title: r.title || 'No title',
          content: r.text || '',
          publishedDate: r.publishedDate,
          score: r.score
        })));
      } catch (error) {
        console.warn(`Exa search failed for "${query}":`, error);
      }
    }

    return {
      urls: allResults.map(r => r.url),
      results: allResults,
      source: 'exa'
    };
  }

  async searchTavilyOnly(queries: string[]): Promise<SearchResult> {
    if (!this.tavilyClient) {
      throw new Error("Tavily API key not configured");
    }

    console.log(`🔍 Searching with Tavily (${queries.length} queries)`);
    const allResults: TavilyResult[] = [];

    for (const query of queries.slice(0, 5)) {
      try {
        const result = await this.tavilyClient.search(query);

        const formattedResults = result.results.map((item: any) => ({
          url: item.url,
          title: item.title || "No title",
          content: item.content || "",
          publishedDate: item.published_date || undefined
        }));

        allResults.push(...formattedResults);
      } catch (error) {
        console.warn(`Tavily search failed for "${query}":`, error);
      }
    }

    return {
      urls: allResults.map(r => r.url),
      results: allResults,
      source: 'tavily'
    };
  }

  async searchDualEngine(queries: string[]): Promise<SearchResult> {
    if (!this.exaClient || !this.tavilyClient) {
      return this.exaClient ? 
        await this.searchExaOnly(queries) : 
        await this.searchTavilyOnly(queries);
    }

    console.log(`🔍 Dual engine search (${queries.length} queries)`);
    
    const [exaResults, tavilyResults] = await Promise.allSettled([
      this.searchExaOnly(queries.slice(0, 2)),
      this.searchTavilyOnly(queries.slice(0, 3))
    ]);

    const combinedResults: Array<TavilyResult | ExaResult> = [];
    const urls: string[] = [];

    if (exaResults.status === 'fulfilled') {
      combinedResults.push(...exaResults.value.results);
      urls.push(...exaResults.value.urls);
    }

    if (tavilyResults.status === 'fulfilled') {
      const newTavilyResults = tavilyResults.value.results.filter(
        r => !urls.includes(r.url)
      );
      combinedResults.push(...newTavilyResults);
      urls.push(...newTavilyResults.map(r => r.url));
    }

    return {
      urls,
      results: combinedResults,
      source: 'combined'
    };
  }
}
