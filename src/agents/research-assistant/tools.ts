import { createTool } from "@iqai/adk";
import { z } from "zod";
import * as cheerio from 'cheerio';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import { chromium } from 'playwright';
import axios from 'axios';
import { ExaResult, ScrapedContent, ResearchData } from "../../shared/types";

/**
 * Tool for searching the web using Exa API with rate limiting and error handling.
 * Executes multiple search queries and returns consolidated results with metadata.
 * Includes automatic retry logic for rate limits and network issues.
 */
export const tavilySearch = createTool({
  name: "tavily_search",
  description: "Searches the web using Tavily API for multiple queries with rate limiting",
  schema: z.object({
    queries: z.array(z.string()),
    numResults: z.number().optional().default(5),
    recentDays: z.number().optional()
  }),
  fn: async ({ queries, numResults, recentDays }, context): Promise<ExaResult[]> => {
    console.debug('[tool:tavily_search] invoked, queries=', queries.length, 'numResults=', numResults, 'recentDays=', recentDays);
  if (!process.env.TAVILY_API_KEY) {
      console.warn('[tool:tavily_search] TAVILY_API_KEY not set - returning mocked results for local development');
      // lightweight mocked results so downstream tools can continue during dev
      return queries.map((q, i) => ({
        url: `https://example.com/mock-${i}`,
        title: `Mock result for: ${q}`,
        publishedDate: new Date().toISOString(),
        query: q
      } as ExaResult));
    }

    let TavilyClientImpl: any = null;
    try {
      TavilyClientImpl = (await import('tavily')).TavilyClient;
    } catch (e) {
      console.warn('[tool:tavily_search] failed to dynamically import tavily - returning mocked results', e);
      return queries.map((q, i) => ({
        url: `https://example.com/mock-${i}`,
        title: `Mock result for: ${q}`,
        publishedDate: new Date().toISOString(),
        query: q
      } as ExaResult));
    }

    const client = new TavilyClientImpl({ apiKey: process.env.TAVILY_API_KEY! });
    const allResults: ExaResult[] = [];

    for (const query of queries) {
      try {
        const recencyHint = recentDays ? ` past ${recentDays} days` : '';
        const effectiveQuery = `${query}${recencyHint}`;

        const result = await client.search(effectiveQuery, {
        max_results: numResults,
        include_answer: false,
        include_raw_content: false,
        search_depth: "advanced",
        time_filter: recentDays ? "week" : undefined
});

        const mappedResults = (result.results || []).map((item: any) => ({
          url: item.url,
          title: item.title || 'No Title',
          publishedDate: item.published_date ? new Date(item.published_date).toISOString() : 'Unknown Date',
          content: item.content || '',
          query: query
        } as ExaResult));

        allResults.push(...mappedResults);

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        console.warn(`Tavily search failed for query: "${query}"`, error);
      }
    }

    // Deduplicate by URL and sort by publishedDate (newest first) when possible
    const dedup: Record<string, ExaResult> = {};
    for (const r of allResults) {
      if (!r.url) continue;
      if (!dedup[r.url]) dedup[r.url] = r;
      else if (dedup[r.url].publishedDate === 'Unknown Date' && r.publishedDate && r.publishedDate !== 'Unknown Date') {
        dedup[r.url] = r;
      }
    }

    const final = Object.values(dedup).sort((a, b) => {
      const da = a.publishedDate && a.publishedDate !== 'Unknown Date' ? Date.parse(a.publishedDate) : 0;
      const db = b.publishedDate && b.publishedDate !== 'Unknown Date' ? Date.parse(b.publishedDate) : 0;
      return db - da;
    });

    if (recentDays) {
      const cutoff = Date.now() - Number(recentDays) * 24 * 60 * 60 * 1000;
      return final.filter(r => r.publishedDate && r.publishedDate !== 'Unknown Date' ? Date.parse(r.publishedDate) >= cutoff : false);
    }

    return final;
  },
});

/**
 * Tool for scraping content from URLs using multiple methods with fallback strategies.
 * Combines Axios+Cheerio, Playwright+Cheerio, Axios+Readability, and Playwright+Readability
 * approaches to extract clean content from web pages with robust error handling.
 */
export const universalScraper = createTool({
  name: "universal_scraper",
  description: "Scrapes content from URLs using multiple methods and returns the best results",
  schema: z.object({
    urls: z.array(z.string())
  }),
  fn: async ({ urls }, context): Promise<ScrapedContent[]> => {
    console.debug('[tool:universal_scraper] invoked, urls count=', urls?.length);
    if (!urls || !urls.length) return [];
    const results = await Promise.allSettled(
      urls.map(url => scrapeSingleUrl(url))
    );
    
    return results
      .filter((result): result is PromiseFulfilledResult<ScrapedContent> => 
        result.status === 'fulfilled'
      )
      .map(result => result.value);
  },
});

/**
 * Tool for detecting cryptocurrency tokens mentioned in queries using pattern matching.
 * Identifies both common names and ticker symbols with comprehensive regex patterns
 * for major cryptocurrencies and tokens.
 */
export const tokenDetector = createTool({
  name: "token_detector",
  description: "Detects cryptocurrency tokens mentioned in queries using pattern matching",
  schema: z.object({
    query: z.string()
  }),
  fn: async ({ query }, context): Promise<{tokens: string[], patterns: Record<string, string[]>}> => {
    try {
      console.debug('[tool:token_detector] invoked for query=', query?.substring(0,80));
      const getTokenAgent = (await import('../token-identifier/agent')).getTokenIdentifierAgent;
      const agent = getTokenAgent();

      // call the agent - ADK runtime shapes vary by version; use any to invoke a simple ask/run method
      let raw: any = null;
      try {
        if ((agent as any).runner?.ask) raw = await (agent as any).runner.ask(query);
        else if ((agent as any).ask) raw = await (agent as any).ask(query);
      } catch (e) {
        console.warn('[tool:token_detector] token agent call failed, falling back to regex', e);
        raw = null;
      }

      // If raw is an async iterator/generator, collect its output into a string
      let response = '';
      if (!raw) response = '';
      else if (typeof raw === 'string') response = raw;
      else if (typeof raw[Symbol.asyncIterator] === 'function') {
        // collect async generator
        let buf = '';
        for await (const ev of raw) {
          try {
            if (ev?.content?.text) buf += ev.content.text + '\n';
            else if (typeof ev === 'string') buf += ev + '\n';
          } catch (e) {
            // ignore
          }
        }
        response = buf;
      } else {
        response = JSON.stringify(raw);
      }

      if (!response) {
        return { tokens: [], patterns: {} };
      }

      // Try parse JSON array
      const jsonMatch = response.match(/\[\s*\{[\s\S]*\}\s*\]/);
      if (jsonMatch) {
        try {
          const arr = JSON.parse(jsonMatch[0]);
          const patterns: Record<string, string[]> = {};
          const tokens = arr.map((it: any) => {
            const id = (it.id || it.symbol || it.name || '').toString().toLowerCase();
            patterns[id] = [it.name || id, it.symbol || ''];
            return id;
          });

          return { tokens, patterns };
        } catch (e) {
          // fallthrough
        }
      }

      // Fallback: if agent returned "No tokens found"
      if (/no tokens found/i.test(response)) {
        return { tokens: [], patterns: {} };
      }

      // Final fallback: regex-based detection for a few common tokens
      const fallback = {
        bitcoin: [/bitcoin|btc(?!\w)/i],
        ethereum: [/ethereum|eth(?!\w)/i],
        dogecoin: [/dogecoin|doge(?!\w)/i],
        shiba: [/shiba[\s\-\_]?inu|shib(?!\w)/i],
      } as Record<string, RegExp[]>;

      const detected = Object.entries(fallback).filter(([k, pats]) => pats.some(p => p.test(query))).map(([k]) => k);
      return {
        tokens: detected,
        patterns: Object.fromEntries(detected.map(k => [k, fallback[k].map(p => p.toString())]))
      };
    } catch (error) {
      console.warn('tokenDetector failed to use agent, falling back to basic detection', error);
      return { tokens: [], patterns: {} };
    }
  },
});

/**
 * Tool for executing complete cryptocurrency research workflow.
 * Orchestrates search query execution, content scraping, and token coverage analysis
 * to gather comprehensive research data for cryptocurrency analysis.
 */
export const conductResearchTool = createTool({
  name: "conduct_research",
  description: "Executes complete cryptocurrency research workflow including search, scraping, and analysis",
  schema: z.object({
    query: z.string(),
    synonyms: z.array(z.string())
  }),
  fn: async ({ query, synonyms }, context): Promise<ResearchData> => {
    const searchQueries = [query, ...synonyms];
    
  // Search for information using Tavily
  console.debug('[tool:conduct_research] running tavilySearch for', searchQueries.length, 'queries');
  const searchResults = await (tavilySearch as any).fn({ queries: searchQueries, numResults: 3 }, {} as any);
    
  // Scrape content from found URLs
  const urls = [...new Set(((searchResults || []) as ExaResult[]).map((r: ExaResult) => r.url).filter(Boolean))];
    let scrapedContent: ScrapedContent[] = [];
    if (urls.length) {
      try {
  scrapedContent = await (universalScraper as any).fn({ urls }, {} as any);
      } catch (e) {
        console.warn('[tool:conduct_research] universalScraper failed, continuing with empty scrapedContent', e);
        scrapedContent = [];
      }
    } else {
      console.debug('[tool:conduct_research] no urls found from searchResults');
    }
    
    // Detect tokens and check coverage
  const tokenResult = await (tokenDetector as any).fn({ query }, {} as any);
    const tokenCoverage: Record<string, number> = {};
    
    for (const token of tokenResult.tokens) {
      const count = scrapedContent.filter(c => 
        (tokenResult.patterns[token] || []).some((patternStr: string) => {
          const pattern = new RegExp(patternStr.replace(/^\/|\/$/g, ''), 'i');
          return pattern.test(c.title + ' ' + c.content);
        })
      ).length;
      tokenCoverage[token] = count;
    }
    
    return {
      originalQuery: query,
      synonyms,
      searchResults,
      scrapedContent,
      tokenCoverage
    };
  },
});

// Helper function for single URL scraping
async function scrapeSingleUrl(url: string): Promise<ScrapedContent> {
  console.log(`🔍 Scraping: ${url}`);
  
  const [axiosCheerio, playwrightCheerio, axiosReadability, playwrightReadability] = await Promise.allSettled([
    axiosCheerioMethod(url),
    playwrightCheerioMethod(url),
    axiosReadabilityMethod(url),
    playwrightReadabilityMethod(url)
  ]);

  const results = [
    { method: 'axios-cheerio', result: axiosCheerio },
    { method: 'playwright-cheerio', result: playwrightCheerio },
    { method: 'axios-readability', result: axiosReadability },
    { method: 'playwright-readability', result: playwrightReadability }
  ].filter(r => r.result.status === 'fulfilled' && (r.result as PromiseFulfilledResult<any>).value.content)
   .map(r => ({ ...(r.result as PromiseFulfilledResult<any>).value, method: r.method }));

  if (!results.length) {
    console.log(`❌ All scraping methods failed for: ${url}`);
    throw new Error('All methods failed');
  }

  const best = results.reduce((max, curr) => 
    curr.content.length > max.content.length ? curr : max
  );
  
  console.log(`✅ Successfully scraped ${best.content.length} chars using ${best.method}: ${url.substring(0, 50)}...`);

  return buildScrapedContent(url, best.content, best.html);
}

// Helper methods for scraping
async function axiosCheerioMethod(url: string): Promise<{ content: string; html: string }> {
  try {
    const { data } = await axios.get(url, {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      },
      timeout: 15000
    });
    const content = extractContentCheerio(data);
    return { content, html: data };
  } catch (error) {
    console.warn(`Axios+Cheerio failed for ${url}:`, error);
    return { content: '', html: '' };
  }
}

async function playwrightCheerioMethod(url: string): Promise<{ content: string; html: string }> {
  let browser;
  try {
    browser = await chromium.launch();
    const page = await browser.newPage();
    await page.setExtraHTTPHeaders({
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    });
    await page.goto(url, { timeout: 15000, waitUntil: 'networkidle' });
    const html = await page.content();
    const content = extractContentCheerio(html);
    return { content, html };
  } catch (error) {
    console.warn(`Playwright+Cheerio failed for ${url}:`, error);
    return { content: '', html: '' };
  } finally {
    if (browser) await browser.close();
  }
}

async function axiosReadabilityMethod(url: string): Promise<{ content: string; html: string }> {
  try {
    const { data } = await axios.get(url, {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
      },
      timeout: 15000
    });
    const content = extractContentReadability(data, url);
    return { content, html: data };
  } catch (error) {
    console.warn(`Axios+Readability failed for ${url}:`, error);
    return { content: '', html: '' };
  }
}

async function playwrightReadabilityMethod(url: string): Promise<{ content: string; html: string }> {
  let browser;
  try {
    browser = await chromium.launch();
    const page = await browser.newPage();
    await page.setExtraHTTPHeaders({
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    });
    await page.goto(url, { timeout: 15000, waitUntil: 'networkidle' });
    const html = await page.content();
    const content = extractContentReadability(html, url);
    return { content, html };
  } catch (error) {
    console.warn(`Playwright+Readability failed for ${url}:`, error);
    return { content: '', html: '' };
  } finally {
    if (browser) await browser.close();
  }
}

function extractContentCheerio(html: string): string {
  const $ = cheerio.load(html);
  $('script, style, nav, header, footer, aside, .advertisement, .ad, .sidebar').remove();

  const contentSelectors = [
    'article', 'main', '.content', '.post', '.entry', 
    '.article-content', '.post-content', '.entry-content',
    '.container', '.wrapper', 'body'
  ];
  
  let content = '';
  for (const selector of contentSelectors) {
    content = $(selector).first().text();
    if (content && content.length > 200) break;
  }
  
  if (!content || content.length < 100) {
    content = $('body').text();
  }
  
  return content.replace(/\s+/g, ' ').trim();
}

function extractContentReadability(html: string, url: string): string {
  try {
    const dom = new JSDOM(html, { url });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();
    return article?.textContent ? article.textContent.replace(/\s+/g, ' ').trim() : '';
  } catch (error) {
    return extractContentCheerio(html);
  }
}

function buildScrapedContent(url: string, content: string, html: string): ScrapedContent {
  let title = 'No Title';
  try {
    const $ = cheerio.load(html);
    title = $('h1').first().text().trim() || $('title').text().trim() || 'No Title';
  } catch (error) {
    title = 'No Title';
  }
  
  const cleanedContent = content.substring(0, 8000);
  const wordCount = cleanedContent.split(/\s+/).length;
  const relevanceScore = Math.max(0.3, Math.min(0.9, wordCount / 800));

  return {
    url,
    title,
    content,
    cleanedContent,
    metadata: {
      relevanceScore,
      wordCount,
      source: new URL(url).hostname
    }
  };
}