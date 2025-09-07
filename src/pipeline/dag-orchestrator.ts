// dag-pipeline.ts
import { SynonymGeneratorService } from '../services/synonym-generator';
import { fetchDetailedCoinData, retrieveCoinIDs, getCachedKnowledgeBase, extractPotentialTokens } from '../services/market-data';
import { SearchService } from '../services/search';
import { WebScraper } from '../services/scraper';
import { MarketData } from '../types/index';
import { google } from "@ai-sdk/google";
import { generateText } from "ai";
import { env } from "../env";

export interface PipelineContext {
  rawQuery: string;
  sanitizedQuery?: string;
  isValid?: boolean;
  knowledgeBase?: Array<{ id: string; symbol: string; name: string }>;
  potentialTokens?: string[];
  matchedAssets?: Array<{ name: string; id: string; symbol: string }> | { error: string; suggestions?: any[] };
  synonymQueries?: string[];
  augmentedMarket?: MarketData[];
  searchQueries?: string[];
  searchResults?: any[];
  scraped?: any[];
  finalReport?: string;
  newsSummaries?: string[];
  errors: string[];
}

type Node = {
  name: string;
  deps: string[];
  run: (ctx: PipelineContext) => Promise<Partial<PipelineContext>>;
};

/* ---------- DAG Nodes ---------- */

const nodes: Node[] = [
  {
    name: "validate",
    deps: [],
    run: async (ctx) => {
      const syn = new SynonymGeneratorService();
      const { isValid, sanitizedQuery } = await syn.validateCryptoQuery(ctx.rawQuery);
      if (!isValid) return { isValid, sanitizedQuery, errors: [...ctx.errors, 'Invalid crypto query'] };
      return { isValid, sanitizedQuery };
    }
  },
  {
    name: "knowledgeBase",
    deps: [],
    run: async () => {
      const kb = await getCachedKnowledgeBase();
      return { knowledgeBase: kb };
    }
  },
  {
    name: "tokenMatcher",
    deps: ["validate", "knowledgeBase"],
    run: async (ctx) => {
      if (!ctx.sanitizedQuery || !ctx.knowledgeBase) return {};
      const tokens = extractPotentialTokens(ctx.sanitizedQuery);
      const matches = await retrieveCoinIDs(tokens, ctx.knowledgeBase);
      return { potentialTokens: tokens, matchedAssets: matches };
    }
  },
  {
    name: "synonyms",
    deps: ["tokenMatcher"],
    run: async (ctx) => {
      if (!ctx.sanitizedQuery) return {};
      const syn = new SynonymGeneratorService();
      const res = await syn.generateSynonyms(ctx.sanitizedQuery);
      return { synonymQueries: res.synonyms };
    }
  },
  {
    name: "marketAugmentor",
    deps: ["tokenMatcher"],
    run: async (ctx) => {
      if (!Array.isArray(ctx.matchedAssets) || ctx.matchedAssets.length === 0) return { augmentedMarket: [] };
      const detailed = await fetchDetailedCoinData(ctx.matchedAssets);
      return { augmentedMarket: detailed };
    }
  },
  {
    name: "searchAndScrape",
    deps: ["synonyms", "marketAugmentor"],
    run: async (ctx) => {
      const queries = (ctx.synonymQueries && ctx.synonymQueries.length > 0) 
        ? ctx.synonymQueries.slice(0, 6) 
        : [ctx.sanitizedQuery || ctx.rawQuery];

      const searchService = new SearchService();
      const search = await searchService.searchDualEngine(queries);
      const scraper = new WebScraper();
      const scraped = await scraper.scrapeMultiple(search.urls.slice(0, 8));
      await scraper.cleanup();
      return { searchQueries: queries, searchResults: search.results, scraped };
    }
  },
  {
    name: "report",
    deps: ["searchAndScrape"],
    run: async (ctx) => {
      const query = ctx.sanitizedQuery || ctx.rawQuery;
      const marketData = ctx.augmentedMarket || [];
      const news = (ctx.scraped || []).map(s => ({
        url: s.url,
        title: s.title,
        content: s.cleanedContent || s.content || '',
        publishedDate: s.publishedDate
      })).slice(0, 8);

      const prompt = `You are a professional cryptocurrency analyst.
QUERY: ${query}
CURRENT DATE: ${new Date().toISOString().split('T')[0]}
MARKET DATA:\n${marketData.map(c => `- ${c.name} (${c.symbol.toUpperCase()}): $${c.current_price} 24h ${c.price_change_percentage_24h?.toFixed(2)}% MCAP $${c.market_cap?.toLocaleString()}`).join('\n')}
NEWS:\n${news.map((n,i)=>`${i+1}. ${n.title} | ${n.url} | ${(n.content||'').substring(0,300)}`).join('\n')}
TASK: Produce a concise, markdown-formatted report with sections: Executive Summary, Market Analysis, Recent Developments, Risks, Outlook & Recommendations, Disclaimer. Do NOT invent dates; if missing write 'Unknown'.`;

      try {
        const model = google(env.LLM_MODEL || 'gemini-2.0-flash-exp');
        const result = await generateText({ model, prompt, maxTokens: 2500, temperature: 0.6 });
        return { finalReport: result.text };
      } catch (e: any) {
        const fallback = `# Crypto Report\n\n## Query\n${query}\n\n## Market Snapshot\n${marketData.map(c=>`- ${c.name}: $${c.current_price} (${c.price_change_percentage_24h?.toFixed(2)}% 24h)`).join('\n')}\n\n## News\n${news.map(n=>`- ${n.title} (${n.publishedDate||'Unknown'})`).join('\n')}\n\n## Disclaimer\nInformational only; not financial advice.`;
        return { finalReport: fallback, errors: [...ctx.errors, 'LLM report generation failed'] };
      }
    }
  }
];

/* ---------- DAG Executor ---------- */

export async function runDAGPipeline(query: string): Promise<PipelineContext> {
  const ctx: PipelineContext = { rawQuery: query, errors: [] };
  const completed = new Set<string>();

  while (completed.size < nodes.length) {
    const ready = nodes.filter(n =>
      !completed.has(n.name) &&
      n.deps.every(dep => completed.has(dep))
    );

    if (ready.length === 0) throw new Error("Cyclic or unsatisfied dependencies in DAG");

    await Promise.all(ready.map(async node => {
      try {
        const delta = await node.run(ctx);
        Object.assign(ctx, delta);
      } catch (e: any) {
        ctx.errors.push(`${node.name} failed: ${e.message || e}`);
      }
      completed.add(node.name);
    }));
  }
  return ctx;
}
