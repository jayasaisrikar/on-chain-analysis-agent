export interface SynonymResponse {
  synonyms: string[];
  originalQuery: string;
}

export interface ScrapedContent {
  url: string;
  title: string;
  content: string;
  cleanedContent: string;
  metadata: {
    relevanceScore: number;
    wordCount: number;
    source: string;
  };
}

export interface ExaResult {
  url: string;
  title: string;
  publishedDate?: string;
  query?: string;
}

export interface ResearchData {
  originalQuery: string;
  synonyms: string[];
  searchResults: ExaResult[];
  scrapedContent: ScrapedContent[];
  tokenCoverage: Record<string, number>;
}