import { TavilyClient } from "tavily";
import { Exa } from "exa-js";
import { config } from "../config.js";

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

export class SearchService {
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

        const formattedResults = result.results.map((item: any) => ({
          url: item.url,
          title: item.title || "No title",
          content: item.text || "",
          publishedDate: item.publishedDate || undefined,
          score: item.score
        }));

        allResults.push(...formattedResults);
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        console.error(`Exa search failed for query "${query}":`, error);
      }
    }

    const urls = allResults.map(result => result.url);
    console.log(`✅ Exa found ${allResults.length} results`);

    return {
      urls,
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

    for (const query of queries.slice(0, 3)) {
      try {
        const result = await this.tavilyClient.search(query);

        const formattedResults = result.results.map((item: any) => ({
          url: item.url,
          title: item.title || "No title",
          content: item.content || "",
          publishedDate: item.published_date || undefined
        }));

        allResults.push(...formattedResults);
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`Tavily search failed for query "${query}":`, error);
      }
    }

    const urls = allResults.map(result => result.url);
    console.log(`✅ Tavily found ${allResults.length} results`);

    return {
      urls,
      results: allResults,
      source: 'tavily'
    };
  }

  async searchDualEngine(queries: string[]): Promise<SearchResult> {
    console.log(`🔍 Searching with dual engine (Exa + Tavily)`);
    
    const [exaResults, tavilyResults] = await Promise.allSettled([
      this.exaClient ? this.searchExaOnly(queries) : Promise.resolve({ urls: [], results: [], source: 'exa' as const }),
      this.tavilyClient ? this.searchTavilyOnly(queries) : Promise.resolve({ urls: [], results: [], source: 'tavily' as const })
    ]);

    const exa = exaResults.status === 'fulfilled' ? exaResults.value : { urls: [], results: [], source: 'exa' as const };
    const tavily = tavilyResults.status === 'fulfilled' ? tavilyResults.value : { urls: [], results: [], source: 'tavily' as const };

    const allUrls = [...exa.urls, ...tavily.urls];
    const uniqueUrls = [...new Set(allUrls)];
    const allResults = [...exa.results, ...tavily.results];

    console.log(`✅ Dual engine found ${allResults.length} total results, ${uniqueUrls.length} unique URLs`);

    return {
      urls: uniqueUrls,
      results: allResults,
      source: 'combined'
    };
  }
}
