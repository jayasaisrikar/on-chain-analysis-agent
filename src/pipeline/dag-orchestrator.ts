// dag-pipeline.ts
// Use sub-agent agent wrappers (tool-enabled) instead of direct service adapters
import { synonymAgent } from '../agents/crypto-analysis-agent/sub-agents/synonym-agent/agent';
import { marketDataAgent } from '../agents/crypto-analysis-agent/sub-agents/market-data-agent/agent';
import { researchAgent } from '../agents/crypto-analysis-agent/sub-agents/research-agent/agent';
import { retrieveCoinIDs, getCachedKnowledgeBase, extractPotentialTokens } from '../services/market-data';
import { MarketData } from '../types/index';
import { google } from "@ai-sdk/google";
import { generateText } from "ai";
import { env } from "../env";
import { ParallelAgent, makeAgent } from './agents';

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

// Lazy singletons for agent instances
let synonymAgentInstance: any = null;
let marketDataAgentInstance: any = null;
let researchAgentInstance: any = null; // (not actively used in current optimized path)

// Helper: extract first JSON object or array from a string
function extractJson<T = any>(text: string): T | null {
  try {
    // Try full parse first
    return JSON.parse(text);
  } catch {}
  const objMatch = text.match(/\{[\s\S]*\}/);
  if (objMatch) {
    try { return JSON.parse(objMatch[0]); } catch {}
  }
  const arrMatch = text.match(/\[[\s\S]*\]/);
  if (arrMatch) {
    try { return JSON.parse(arrMatch[0]); } catch {}
  }
  return null;
}

const validateAgent = makeAgent('validate', async (ctx) => {
  if (!synonymAgentInstance) {
    try { synonymAgentInstance = await synonymAgent(); } catch (e) { return { errors: [...ctx.errors, `synonymAgent init failed: ${(e as any).message || e}`] }; }
  }
  try {
    const prompt = `Use synonym_service tool with action=validateQuery for the user query. Return ONLY JSON {"isValid":boolean,"sanitizedQuery":string}. Query: ${ctx.rawQuery}`;
    const raw = await synonymAgentInstance.runner.ask(prompt);
    const parsed = typeof raw === 'string' ? extractJson(raw) : raw;
    const isValid = !!parsed?.isValid;
    const sanitizedQuery = parsed?.sanitizedQuery || ctx.rawQuery;
    if (!isValid) return { isValid, sanitizedQuery, errors: [...ctx.errors, 'Invalid crypto query'] };
    return { isValid, sanitizedQuery };
  } catch (e) {
    return { errors: [...ctx.errors, `validate failed: ${(e as any).message || e}`] };
  }
});

const knowledgeBaseAgent = makeAgent('knowledgeBase', async () => {
  const kb = await getCachedKnowledgeBase();
  return { knowledgeBase: kb };
});

const parallelInitial = new ParallelAgent({
  name: 'initial_parallel',
  subAgents: [validateAgent, knowledgeBaseAgent]
});

const tokenMatcherAgent = makeAgent('tokenMatcher', async (ctx) => {
  if (!ctx.sanitizedQuery || !ctx.knowledgeBase) return {};
  const tokens = extractPotentialTokens(ctx.sanitizedQuery);
  const matches = await retrieveCoinIDs(tokens, ctx.knowledgeBase);
  return { potentialTokens: tokens, matchedAssets: matches };
});

const synonymsAgent = makeAgent('synonyms', async (ctx) => {
  if (!ctx.sanitizedQuery) return {};
  if (!synonymAgentInstance) return {};
  try {
    const prompt = `Use synonym_service tool with action=generateSynonyms for query: ${ctx.sanitizedQuery}. Return ONLY JSON {"synonyms":["..."]}.`;
    const raw = await synonymAgentInstance.runner.ask(prompt);
    const parsed = typeof raw === 'string' ? extractJson(raw) : raw;
    const synonyms = Array.isArray(parsed?.synonyms) ? parsed.synonyms.slice(0, 12) : [];
    return { synonymQueries: synonyms };
  } catch (e) {
    return { errors: [...ctx.errors, `synonyms failed: ${(e as any).message || e}`] };
  }
});

const marketAugmentorAgent = makeAgent('marketAugmentor', async (ctx) => {
  if (!Array.isArray(ctx.matchedAssets) || ctx.matchedAssets.length === 0) return { augmentedMarket: [] };
  if (!marketDataAgentInstance) {
    try { marketDataAgentInstance = await marketDataAgent(); } catch (e) { return { errors: [...ctx.errors, `marketDataAgent init failed: ${(e as any).message || e}`], augmentedMarket: [] }; }
  }
  const coinIds = ctx.matchedAssets.map(a => a.id);
  try {
    const prompt = `Use market_data_service tool with action=getMarketData and coinIds=${JSON.stringify(coinIds)}. Return ONLY JSON array.`;
    const raw = await marketDataAgentInstance.runner.ask(prompt);
    const parsed = typeof raw === 'string' ? extractJson(raw) : raw;
    const arr = Array.isArray(parsed) ? parsed : [];
    return { augmentedMarket: arr as any };
  } catch (e) {
    return { augmentedMarket: [], errors: [...ctx.errors, `marketAugmentor failed: ${(e as any).message || e}`] };
  }
});

const parallelPostMatcher = new ParallelAgent({
  name: 'post_matcher_parallel',
  subAgents: [synonymsAgent, marketAugmentorAgent]
});

// researchAgentInstance declared earlier

const searchAndScrapeAgent = makeAgent('searchAndScrape', async (ctx) => {
  const base = ctx.sanitizedQuery || ctx.rawQuery;
  const syns = (ctx.synonymQueries || []).filter(s => s && s !== base);
  const maxQueries = Number((env as any).RESEARCH_MAX_QUERIES || 1); // default 1 to cut duplicate logs
  const queries = [base, ...syns].slice(0, maxQueries);

  if (!researchAgentInstance) {
    try { researchAgentInstance = await researchAgent(); } catch (e) {
      return { searchQueries: queries, scraped: [], errors: [...ctx.errors, `researchAgent init failed: ${(e as any).message || e}`] };
    }
  }

  // We'll run searchAndScrape for only the first query to reduce log noise; others can be future extension.
  const primaryQuery = queries[0];
  try {
    const prompt = `Use research_service tool with action=searchAndScrape, query="${primaryQuery}", maxResults=6. Return ONLY JSON array of objects with fields url,title,content,publishedDate.`;
    const raw = await researchAgentInstance.runner.ask(prompt);
    let parsed = raw as any;
    if (typeof raw === 'string') {
      const jsonMatch = raw.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        try { parsed = JSON.parse(jsonMatch[0]); } catch {}
      }
    }
    const scraped = Array.isArray(parsed) ? parsed : [];
    return { searchQueries: queries, searchResults: scraped, scraped };
  } catch (e) {
    return { searchQueries: queries, searchResults: [], scraped: [], errors: [...ctx.errors, `searchAndScrape failed: ${(e as any).message || e}`] };
  }
});

const reportAgent = makeAgent('report', async (ctx) => {
  const query = ctx.sanitizedQuery || ctx.rawQuery;
  const marketData = ctx.augmentedMarket || [];
  const news = (ctx.scraped || []).map(s => ({
    url: s.url,
    title: s.title,
    content: s.cleanedContent || s.content || '',
    publishedDate: s.publishedDate
  })).slice(0, 8);

  // Trim market/news if too large to reduce token pressure
  const trimmedMarketLines = marketData.slice(0, 15); // safeguard
  const trimmedNews = news.map(n => ({ ...n, content: (n.content || '').slice(0, 600) }));

  const basePrompt = `You are a professional cryptocurrency analyst.\nQUERY: ${query}\nCURRENT DATE: ${new Date().toISOString().split('T')[0]}\nMARKET DATA:\n${trimmedMarketLines.map(c => `- ${c.name} (${c.symbol.toUpperCase()}): $${c.current_price} 24h ${c.price_change_percentage_24h?.toFixed(2)}% MCAP $${c.market_cap?.toLocaleString()}`).join('\n')}\nNEWS:\n${trimmedNews.map((n,i)=>`${i+1}. ${n.title} | ${n.url} | ${(n.content||'').substring(0,400)}`).join('\n')}\nTASK: Produce a concise, markdown-formatted report with sections: Executive Summary, Market Analysis, Recent Developments, Risks, Outlook & Recommendations, Disclaimer. Do NOT invent dates; if missing write 'Unknown'. Ensure all required sections are present.`;

  const requiredSections = [
    'Executive Summary',
    'Market Analysis',
    'Recent Developments',
    'Risks',
    'Outlook', // substring match acceptable
    'Disclaimer'
  ];

  function isIncomplete(text: string, finishReason?: string): boolean {
    if (!text) return true;
    // If finish reason indicates length (model dependent) or missing any required heading
    const lower = text.toLowerCase();
    const missing = requiredSections.some(h => !lower.includes(h.toLowerCase()));
    const suspiciousTail = /\(Source:[^\n]*$/.test(text); // cut mid parenthetical
  const reasonFlag = finishReason ? /length|max/.test(finishReason) : false;
  return missing || suspiciousTail || reasonFlag;
  }

  try {
  const model = google(env.LLM_MODEL || 'gemini-2.0-flash-exp');
  const maxTokens = 2500; // fixed cap; adjust if env adds configurable value later
    const first = await generateText({ model, prompt: basePrompt, maxTokens, temperature: 0.6 });
    let report = first.text;
    // We attempt at most one continuation to avoid runaway usage.
    // @ts-ignore (finishReason may exist depending on sdk version)
    const finishReason: string | undefined = (first as any).finishReason;
    if (isIncomplete(report, finishReason)) {
      const continuationPrompt = `The previous report may have been truncated or is missing required sections. Current partial content below:\n---\n${report}\n---\nContinue ONLY from where it left off. Do NOT repeat already complete sections. If any required section is missing or incomplete, provide it. End with a complete 'Disclaimer' section.`;
      const second = await generateText({ model, prompt: continuationPrompt, maxTokens: Math.min(maxTokens / 2, 1200), temperature: 0.55 });
      // Simple merge: if second starts with a heading already present at end, just append.
      const cleanedSecond = second.text.trim();
      if (cleanedSecond && !report.includes(cleanedSecond)) {
        // Avoid duplicating disclaimer
        if (/##\s*Disclaimer/i.test(report) && /##\s*Disclaimer/i.test(cleanedSecond)) {
          // If disclaimer exists in both, keep the longer version
          const existing = report.match(/##\s*Disclaimer[\s\S]*$/i)?.[0] || '';
            const newDisc = cleanedSecond.match(/##\s*Disclaimer[\s\S]*$/i)?.[0] || '';
            if (newDisc.length > existing.length) {
              report = report.replace(existing, newDisc);
            }
        } else {
          report += (report.endsWith('\n') ? '' : '\n') + cleanedSecond + '\n';
        }
      }
    }
    return { finalReport: report };
  } catch (e: any) {
    const fallback = `# Crypto Report\n\n## Query\n${query}\n\n## Market Snapshot\n${marketData.map(c=>`- ${c.name}: $${c.current_price} (${c.price_change_percentage_24h?.toFixed(2)}% 24h)`).join('\n')}\n\n## News\n${news.map(n=>`- ${n.title} (${n.publishedDate||'Unknown'})`).join('\n')}\n\n## Disclaimer\nInformational only; not financial advice.`;
    return { finalReport: fallback, errors: [...ctx.errors, 'LLM report generation failed'] };
  }
});

const nodes: Node[] = [
  { name: 'initial_parallel', deps: [], run: (ctx) => parallelInitial.run(ctx) },
  { name: 'tokenMatcher', deps: ['initial_parallel'], run: (ctx) => tokenMatcherAgent.run(ctx) },
  { name: 'post_matcher_parallel', deps: ['tokenMatcher'], run: (ctx) => parallelPostMatcher.run(ctx) },
  { name: 'searchAndScrape', deps: ['post_matcher_parallel'], run: (ctx) => searchAndScrapeAgent.run(ctx) },
  { name: 'report', deps: ['searchAndScrape'], run: (ctx) => reportAgent.run(ctx) }
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
