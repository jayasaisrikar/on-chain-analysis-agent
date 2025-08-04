import "dotenv/config";
import { openai } from "@ai-sdk/openai";
import { SearchService } from './services/search.js';
import { WebScraper } from './services/scraper.js';
import { MarketDataService } from './services/market-data.js';

function getCurrentDateFormatted(): string {
  return new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
}

class Timer {
  private startTime: number;
  private label: string;

  constructor(label: string) {
    this.label = label;
    this.startTime = Date.now();
  }

  elapsed(): number {
    return Date.now() - this.startTime;
  }

  log() {
    console.log(`${this.label}: ${this.elapsed()}ms`);
  }
}

const userQuery = process.env.USER_QUERY?.replace(/^"|"$/g, '') || process.argv[2] || "Technical analysis on Shiba Inu and PEAR Protocol";

async function sanitizeAndValidateQuery(query: string): Promise<{ isValid: boolean; sanitizedQuery: string }> {
  const systemPrompt = `Check if the query is about cryptocurrencies. If yes, return the clean query. If not, return "Sorry, please ask about crypto-related insights."`;
  
  try {
    const { generateText } = await import("ai");
    const result = await generateText({
      model: openai('gpt-4-turbo'),
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: query }
      ]
    });
    
    const sanitizedQuery = result.text.trim();
    const isValid = !sanitizedQuery.includes("Sorry, please ask about crypto-related insights.");
    return { isValid, sanitizedQuery };
  } catch (error) {
    console.error('Query validation failed:', error);
    return { isValid: false, sanitizedQuery: "Sorry, please ask about crypto-related insights." };
  }
}

const systemPrompt = `Generate 3 search queries for cryptocurrency research. Today is ${getCurrentDateFormatted()}. Return JSON format: {"1": "query1", "2": "query2", "3": "query3"}`;

interface SynonymResponse {
  [key: string]: string;
}

interface ScrapedContent {
  url: string;
  title: string;
  content: string;
  timestamp: Date;
  publishedDate?: Date;
  publishedDateString?: string;
}

async function generateSynonyms(originalQuery: string): Promise<SynonymResponse> {
  try {
    const { generateText } = await import("ai");
    const result = await generateText({
      model: openai('gpt-4-turbo'),
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: originalQuery }
      ]
    });
    return JSON.parse(result.text);
  } catch (error) {
    console.error('Failed to generate synonyms:', error);
    return { "1": originalQuery };
  }
}

function createAnalysisPrompt(scrapedContents: ScrapedContent[], synonymQueries: SynonymResponse, augmentedData: any): string {
  const contentSummary = scrapedContents.map((content, index) => 
    `${index + 1}. ${content.title}\nURL: ${content.url}\nContent: ${content.content.substring(0, 1000)}...`
  ).join('\n\n');

  let prompt = `Based on the following information, provide a comprehensive crypto analysis:

SEARCH QUERIES:
${Object.entries(synonymQueries).map(([key, query]) => `${key}. ${query}`).join('\n')}`;

  if (augmentedData && Object.keys(augmentedData).length > 0) {
    prompt += `\n\nLIVE MARKET DATA (from CoinGecko API):\n`;
    for (const id in augmentedData) {
      const coin = augmentedData[id];
      prompt += `### ${coin.name} (${coin.symbol.toUpperCase()})\n`;
      prompt += `Current Price: $${coin.current_price}\n`;
      prompt += `Market Cap: $${coin.market_cap?.toLocaleString?.() ?? coin.market_cap}\n`;
      prompt += `24h Change: ${coin.price_change_24h?.toFixed?.(2) ?? coin.price_change_24h}%\n`;
      prompt += `24h High/Low: $${coin.high_24h} / $${coin.low_24h}\n\n`;
    }
  }

  prompt += `\nSCRAPED CONTENT:\n${contentSummary}\n\nProvide analysis including price trends, market sentiment, and key insights.`;
  return prompt;
}

async function generateFinalAnalysis(analysisPrompt: string): Promise<string> {
  try {
    const { generateText } = await import("ai");
    const result = await generateText({
      model: openai('gpt-4o-mini'),
      messages: [
        { role: 'system', content: 'Provide comprehensive cryptocurrency analysis based on the provided data.' },
        { role: 'user', content: analysisPrompt }
      ]
    });
    return result.text;
  } catch (error) {
    console.error('Failed to generate analysis:', error);
    return 'Analysis generation failed.';
  }
}

async function main() {
  const enableExa = process.env.ENABLE_EXA === 'true';
  let searchEngine = process.env.SEARCH_ENGINE || process.argv[3] || 'tavily';
  
  if (!enableExa && searchEngine === 'dual') {
    searchEngine = 'tavily';
  }

  console.log(`🔧 EXA Enabled: ${enableExa ? '✅' : '❌'}`);
  console.log(`🔍 Search Engine: ${searchEngine.toUpperCase()}`);
  console.log(`🚀 Starting crypto analysis for: "${userQuery}"`);
  
  const validation = await sanitizeAndValidateQuery(userQuery);
  if (!validation.isValid) {
    console.log(validation.sanitizedQuery);
    return;
  }
  
  const timer = new Timer('Total Analysis');
  
  const marketDataService = new MarketDataService();
  
  console.log('📦 Setting up knowledge base from CoinGecko...');
  await marketDataService.setupKnowledgeBase();
  
  const detectionResult = await marketDataService.retrieveCoinIDs(validation.sanitizedQuery);
  
  // Check if we got an error response
  if ('error' in detectionResult) {
    console.log('❌ Token detection failed:', detectionResult.error);
    
    if (detectionResult.suggestions && detectionResult.suggestions.length > 0) {
      console.log('\n💡 Suggested tokens:');
      detectionResult.suggestions.forEach((suggestion, index) => {
        console.log(`${index + 1}. ${suggestion.name} (${suggestion.symbol.toUpperCase()})`);
      });
      console.log('\nPlease ask questions with complete names like in this list to process your request. If your token is not listed, sorry we are not serving that token right now.');
    } else {
      console.log('Sorry, we only serve mid to popular coins for now. Please ask about well-known cryptocurrencies.');
    }
    
    timer.log();
    return;
  }
  
  const detectedAssets = detectionResult as Array<{ name: string; id: string; symbol: string }>;
  console.log(`🪙 Detected ${detectedAssets.length} relevant coins`);
  
  const synonyms = await generateSynonyms(validation.sanitizedQuery);
  console.log(`📝 Generated ${Object.keys(synonyms).length} search queries`);
  
  const searchService = new SearchService();
  let searchResults: any;
  
  switch (searchEngine) {
    case 'exa':
      searchResults = await searchService.searchExaOnly(Object.values(synonyms));
      break;
    case 'tavily':
      searchResults = await searchService.searchTavilyOnly(Object.values(synonyms));
      break;
    case 'dual':
    default:
      searchResults = await searchService.searchDualEngine(Object.values(synonyms));
      break;
  }
  
  console.log(`🔍 Found ${searchResults.urls.length} URLs from ${searchEngine} search`);
  
  const webScraper = new WebScraper();
  const scrapedContents: ScrapedContent[] = [];
  
  try {
    const scrapedResults = await webScraper.scrapeMultiple(searchResults.urls.slice(0, 10));
    
    for (const result of scrapedResults) {
      scrapedContents.push({
        url: result.url,
        title: result.title,
        content: result.content,
        timestamp: new Date(),
        publishedDate: result.publishedDate ? new Date(result.publishedDate) : undefined,
        publishedDateString: result.publishedDate || undefined
      });
    }
  } catch (error) {
    console.error('Scraping failed:', error);
  }
  
  const augmentedData = await marketDataService.fetchDetailedCoinData(detectedAssets);
  
  const analysisPrompt = createAnalysisPrompt(scrapedContents, synonyms, augmentedData);
  const finalAnalysis = await generateFinalAnalysis(analysisPrompt);
  
  timer.log();
  console.log('\n📊 FINAL ANALYSIS:\n');
  console.log(finalAnalysis);
  
  await webScraper.cleanup();
}

main().catch(console.error);
