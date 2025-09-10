import axios from 'axios';
import * as cheerio from 'cheerio';
import { chromium, Browser } from 'playwright';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import { ScrapedContent } from "../../types/index.js";
import { DateExtractor } from "../../utils/date-extractor.js";

const userAgents = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0'
];

const getRandomUserAgent = () => userAgents[Math.floor(Math.random() * userAgents.length)];

/**
 * Web scraping tools for content extraction using multiple fallback methods
 */
export class ScraperTools {
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
      const response = await axios.get(url, {
        timeout: this.timeout,
        headers: {
          'User-Agent': getRandomUserAgent(),
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        }
      });

      return this.extractContent(response.data, url);
    } catch (error) {
      console.warn(`Axios method failed for ${url}: ${error}`);
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
        userAgent: getRandomUserAgent()
      });

      const page = await context.newPage();
      
      await page.goto(url, { 
        waitUntil: 'domcontentloaded',
        timeout: this.timeout 
      });

      await page.waitForTimeout(2000);

      const content = await page.content();
      await context.close();

      return this.extractContent(content, url);
    } catch (error) {
      console.warn(`Playwright method failed for ${url}: ${error}`);
      return null;
    }
  }

  private extractContent(html: string, url: string): ScrapedContent | null {
    try {
      const $ = cheerio.load(html);
      
      $('script, style, nav, header, footer, aside, .advertisement, .ads, .cookie-banner').remove();

      const dom = new JSDOM(html, { url });
      const reader = new Readability(dom.window.document);
      const article = reader.parse();

      if (!article) {
        throw new Error('Readability failed to parse content');
      }

      const title = article.title || $('title').text() || 'No title found';
      const content = article.textContent || $('body').text();

      if (!content || content.trim().length < 100) {
        throw new Error('Content too short or empty');
      }

      const dateExtractor = new DateExtractor();
      const publishedDate = DateExtractor.extractPublicationDate(html, url);

      return {
        url,
        title: title.trim().substring(0, 200),
        content: content.trim().substring(0, 3000),
        cleanedContent: content.trim().substring(0, 3000),
        publishedDate: publishedDate || undefined,
        metadata: {
          relevanceScore: 0.8,
          wordCount: content.split(' ').length,
          source: 'web_scraper'
        }
      };
    } catch (error) {
      console.warn(`Content extraction failed for ${url}: ${error}`);
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
