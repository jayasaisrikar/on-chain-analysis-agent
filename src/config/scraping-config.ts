import { ScrapingConfig } from '../types/index.js';

const defaultConfig: ScrapingConfig = {
  maxConcurrent: 6,
  timeout: 10000,
  maxRetries: 3,
  skipSlowMethods: true,
  skipProblematicDomains: ['mexc.com', 'bitget.com', 'gate.io'],
  fastMethods: ['axios-stealth', 'axios-cheerio', 'axios-readability']
};

export const getScrapingConfig = (searchEngine: string): ScrapingConfig => {
  return defaultConfig;
};
