import * as cheerio from 'cheerio';

export class DateExtractor {
  static extractPublicationDate(html: string, url: string): string | null {
    const $ = cheerio.load(html);
    
    const selectors = [
      'time[datetime]',
      '[datetime]',
      'meta[property="article:published_time"]',
      'meta[name="publishdate"]',
      'meta[property="og:article:published_time"]',
      '.published-date',
      '.publication-date', 
      '.post-date',
      '.article-date',
      '.date-published',
      '.entry-date',
      '.timestamp',
      '.date'
    ];

    for (const selector of selectors) {
      const result = this.trySelector($, selector);
      if (result && this.isValidDate(result)) {
        return result;
      }
    }

    const jsonLdDate = this.extractFromJsonLd($);
    if (jsonLdDate && this.isValidDate(jsonLdDate)) {
      return jsonLdDate;
    }

    const urlDate = this.extractFromUrl(url);
    if (urlDate && this.isValidDate(urlDate)) {
      return urlDate;
    }

    return null;
  }

  private static trySelector($: cheerio.CheerioAPI, selector: string): string | null {
    const element = $(selector).first();
    if (element.length > 0) {
      let dateText = element.attr('datetime') || element.attr('content') || element.text().trim();
      if (dateText) {
        return this.parseDate(dateText);
      }
    }
    return null;
  }

  private static extractFromJsonLd($: cheerio.CheerioAPI): string | null {
    try {
      const scripts = $('script[type="application/ld+json"]');
      for (let i = 0; i < scripts.length; i++) {
        try {
          const jsonData = JSON.parse(scripts.eq(i).html() || '{}');
          const datePublished = jsonData.datePublished || jsonData.dateCreated || 
                               jsonData['@graph']?.[0]?.datePublished;
          if (datePublished) {
            return this.parseDate(datePublished);
          }
        } catch (e) {
          continue;
        }
      }
    } catch (e) {}
    return null;
  }

  private static extractFromUrl(url: string): string | null {
    const urlDateMatch = url.match(/\/(\d{4})\/(\d{1,2})\/(\d{1,2})\//);
    if (urlDateMatch) {
      const [, year, month, day] = urlDateMatch;
      return this.parseDate(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
    }
    return null;
  }

  private static parseDate(dateString: string): string | null {
    try {
      const date = new Date(dateString.trim());
      if (isNaN(date.getTime())) return null;
      return date.toISOString().split('T')[0];
    } catch (error) {
      return null;
    }
  }

  private static isValidDate(dateString: string): boolean {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const twoYearsAgo = new Date();
      twoYearsAgo.setFullYear(now.getFullYear() - 2);
      return date >= twoYearsAgo && date <= now;
    } catch {
      return false;
    }
  }
}
