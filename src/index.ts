import "dotenv/config";
import { SearchService } from './services/search.js';
import { WebScraper } from './services/scraper.js';
import { MarketDataService } from './services/market-data.js';
import { SynonymGeneratorService, SynonymResponse } from './services/synonym-generator.js';

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

interface ScrapedContent {
  url: string;
  title: string;
  content: string;
  timestamp: Date;
  publishedDate?: Date;
  publishedDateString?: string;
}

function createAnalysisPrompt(scrapedContents: ScrapedContent[], synonymResponse: SynonymResponse, augmentedData: any): string {
  const contentSummary = scrapedContents.map((content, index) => 
    `${index + 1}. ${content.title}\nURL: ${content.url}\nContent: ${content.content.substring(0, 1000)}...`
  ).join('\n\n');

  let prompt = `Based on the following information, provide a comprehensive crypto analysis:

ORIGINAL QUERY: ${synonymResponse.originalQuery}

SEARCH QUERIES USED:
${synonymResponse.synonyms.map((query, index) => `${index + 1}. ${query}`).join('\n')}`;

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
    const { AgentBuilder } = await import("@iqai/adk");
    const { openai } = await import("@ai-sdk/openai");
    
    const analysisAgent = await AgentBuilder
      .create("crypto_analysis_agent")
      .withModel(openai("gpt-4o-mini"))
      .withDescription("Comprehensive cryptocurrency analysis expert")
      .withInstruction("You are a professional cryptocurrency analyst. Provide comprehensive, actionable cryptocurrency analysis based on the provided data. Include technical analysis, market sentiment, key insights, and actionable recommendations. Structure your response with clear sections and use markdown formatting.")
      .build();

    const result = await analysisAgent.runner.ask(analysisPrompt);
    return typeof result === 'string' ? result : JSON.stringify(result);
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
  
  // Initialize services
  const synonymGeneratorService = new SynonymGeneratorService();
  const marketDataService = new MarketDataService();
  
  // Validate query
  const validation = await synonymGeneratorService.validateCryptoQuery(userQuery);
  if (!validation.isValid) {
    console.log(validation.sanitizedQuery);
    return;
  }
  
  const timer = new Timer('Total Analysis');
  
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
  
  // Generate synonyms using the service
  const synonymResponse = await synonymGeneratorService.generateSynonyms(validation.sanitizedQuery);
  console.log(`📝 Generated ${synonymResponse.synonyms.length} search queries`);
  
  const searchService = new SearchService();
  let searchResults: any;
  
  const allQueries = [validation.sanitizedQuery, ...synonymResponse.synonyms];
  
  switch (searchEngine) {
    case 'exa':
      searchResults = await searchService.searchExaOnly(allQueries);
      break;
    case 'tavily':
      searchResults = await searchService.searchTavilyOnly(allQueries);
      break;
    case 'dual':
    default:
      searchResults = await searchService.searchDualEngine(allQueries);
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
  
  const analysisPrompt = createAnalysisPrompt(scrapedContents, synonymResponse, augmentedData);
  const finalAnalysis = await generateFinalAnalysis(analysisPrompt);
  
  timer.log();
  console.log('\n📊 FINAL ANALYSIS:\n');
  console.log(finalAnalysis);
  
  await webScraper.cleanup();
}

main().catch(console.error);
