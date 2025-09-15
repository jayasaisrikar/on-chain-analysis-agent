import { createTool } from "@iqai/adk";
import { z } from "zod";
import * as cheerio from 'cheerio';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import axios from 'axios';

interface ScrapedContent {
  url: string;
  title: string;
  content: string;
  publishedDate?: string;
  author?: string;
  length: number;
}

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