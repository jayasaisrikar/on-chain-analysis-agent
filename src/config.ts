import "dotenv/config";

export const config = {
  openai: {
    apiKey: process.env.OPENAI_API_KEY || "",
    model: "gpt-4o-mini"
  },
  google: {
    apiKey: process.env.GOOGLE_API_KEY || "",
    model: "gemini-2.5-flash"
  },
  exa: {
    apiKey: process.env.EXA_API_KEY || ""
  },
  coingecko: {
    apiKey: process.env.COINGECKO_API_KEY || ""
  },
  tavily: {
    apiKey: process.env.TAVILY_API_KEY || ""
  },
  query: {
    default: "Technical analysis on Shiba Inu and PEAR Protocol",
    userQuery: process.env.USER_QUERY || process.argv[2] || "Technical analysis on Shiba Inu and PEAR Protocol"
  },
  search: {
    exaResultsPerQuery: 3,
    tavilyResultsPerQuery: 3,
    maxUrls: 15,
    batchSize: 5,
    rateLimitDelay: 1000,
    maxRetries: 4,
    enableDualEngine: true,
    preferredEngine: 'auto' as 'exa' | 'tavily' | 'auto'
  },
  scraping: {
    timeout: 15000,
    maxContentLength: 8000,
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    maxRetries: 3,
    batchSize: 3,
    delayBetweenRequests: 2000,
    enableStealth: true
  },
  memory: {
    cacheTimeout: 30 * 60 * 1000,
    maxCacheSize: 1000
  },
  marketData: {
    minMarketCap: 1_000_000,
    minVolume: 10_000,
    cacheTimeout: 30 * 60 * 1000
  },
  performance: {
    enableTimers: true,
    enableMemoryTracking: false,
    logLevel: 'info' as 'debug' | 'info' | 'warn' | 'error'
  }
};

export function validateConfig(): boolean {
  const requiredKeys = ['OPENAI_API_KEY', 'GOOGLE_API_KEY'];
  const missingRequired = requiredKeys.filter(key => !process.env[key]);
  return missingRequired.length === 0;
}
