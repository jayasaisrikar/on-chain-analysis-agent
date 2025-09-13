export interface ExaResult {
  url: string;
  title: string;
  publishedDate: string;
  query: string;
}

export interface ScrapedContent {
  url: string;
  title: string;
  content: string;
  publishedDate?: string;
  author?: string;
  length: number;
}

export interface ResearchData {
  query: string;
  synonyms: string[];
  searchResults: ExaResult[];
  scrapedContent: ScrapedContent[];
  tokensFound: string[];
  summary: string;
}
