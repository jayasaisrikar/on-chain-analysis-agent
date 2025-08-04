import axios from 'axios';
import * as cheerio from 'cheerio';
import { chromium, Browser } from 'playwright';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import { ScrapedContent } from "../types/index.js";
import { DateExtractor } from "../utils/date-extractor.js";

const userAgents = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0'
];

const getRandomUserAgent = () => userAgents[Math.floor(Math.random() * userAgents.length)];

export class WebScraper {
  private browser?: Browser;
  private timeout = 10000;

  async scrapeMultiple(urls: string[]): Promise<ScrapedContent[]> {
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
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log(`✅ Successfully scraped ${results.length} URLs`);
    return results;
  }

  async scrapeUrl(url: string): Promise<ScrapedContent | null> {
    try {
      const result = await this.tryAxiosMethod(url);
      if (result) return result;
      
      const playwrightResult = await this.tryPlaywrightMethod(url);
      return playwrightResult;
    } catch (error) {
      console.error(`All methods failed for ${url}: ${error}`);
      return null;
    }
  }

  private async tryAxiosMethod(url: string): Promise<ScrapedContent | null> {
    try {
      const { data } = await axios.get(url, {
        headers: { 'User-Agent': getRandomUserAgent() },
        timeout: this.timeout,
        maxRedirects: 3
      });
      
      return this.extractContent(url, data);
    } catch (error) {
      throw new Error(`Axios failed: ${error}`);
    }
  }

  private async tryPlaywrightMethod(url: string): Promise<ScrapedContent | null> {
    try {
      if (!this.browser) {
        this.browser = await chromium.launch({ headless: true });
      }
      
      const page = await this.browser.newPage({
        userAgent: getRandomUserAgent()
      });
      
      await page.goto(url, { timeout: this.timeout });
      const html = await page.content();
      await page.close();
      
      return this.extractContent(url, html);
    } catch (error) {
      throw new Error(`Playwright failed: ${error}`);
    }
  }

  private extractContent(url: string, html: string): ScrapedContent | null {
    try {
      const $ = cheerio.load(html);
      
      const title = $('title').text().trim() || $('h1').first().text().trim() || 'No title';
      
      const dom = new JSDOM(html, { url });
      const reader = new Readability(dom.window.document);
      const article = reader.parse();
      
      let content = '';
      if (article && article.textContent) {
        content = article.textContent.trim();
      } else {
        content = $('body').text().replace(/\s+/g, ' ').trim();
      }
      
      if (content.length < 100) {
        throw new Error('Insufficient content');
      }
      
      const publishedDate = DateExtractor.extractPublicationDate(html, url);
      
      return {
        url,
        title,
        content,
        cleanedContent: content.substring(0, 8000),
        publishedDate: publishedDate || undefined,
        metadata: {
          relevanceScore: 1.0,
          wordCount: content.split(' ').length,
          source: 'webscraper'
        }
      };
    } catch (error) {
      console.error(`Content extraction failed for ${url}: ${error}`);
      return null;
    }
  }

  async cleanup(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = undefined;
    }
  }
}
