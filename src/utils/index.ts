import { Timer } from "../types/index.js";

export { DateExtractor } from "./date-extractor.js";

export class PerformanceTimer implements Timer {
  private startTime: number;
  private label: string;

  constructor(label: string) {
    this.label = label;
    this.startTime = Date.now();
  }

  elapsed(): number {
    return Date.now() - this.startTime;
  }

  checkpoint(): void {}

  end(): number {
    return this.elapsed();
  }
}

export function getCurrentDateFormatted(): string {
  return new Date().toLocaleDateString('en-GB', { 
    day: '2-digit', 
    month: 'long', 
    year: 'numeric' 
  });
}

export function extractPotentialTokens(query: string): string[] {
  const stopwords = new Set([
    'the', 'and', 'for', 'with', 'analysis', 'technical', 'price', 
    'token', 'coin', 'crypto', 'cryptocurrency', 'vs', 'comparison', 
    'compare', 'latest', 'news', 'market', 'trends', '2025', '2024'
  ]);
  
  const words = query.match(/\b[a-zA-Z0-9]{2,20}\b/g) || [];
  return words.filter(w => !stopwords.has(w.toLowerCase()));
}

export async function batchProcessWithRateLimit<T, R>(
  items: T[],
  batchSize: number,
  fn: (item: T) => Promise<R>,
  minDelayMs: number = 1000,
  maxRetries: number = 4
): Promise<R[]> {
  const results: R[] = [];
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(async (item): Promise<R | null> => {
        let attempt = 0;
        let delay = 1000;
        
        while (true) {
          try {
            return await fn(item);
          } catch (err: any) {
            if (err?.response?.status === 429 || /rate.?limit/i.test(err?.message || '')) {
              if (attempt < maxRetries) {
                attempt++;
                await new Promise(res => setTimeout(res, delay));
                delay *= 2;
                continue;
              }
            }
            return null;
          }
        }
      })
    );
    
    results.push(...batchResults.filter(r => r !== null));
    
    if (i + batchSize < items.length) {
      await new Promise(res => setTimeout(res, minDelayMs));
    }
  }
  
  return results;
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function safeJsonParse<T>(text: string, fallback: T): T {
  try {
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}
