import { ScrapedContent, MarketData } from "../types/index.js";
import { getCurrentDateFormatted } from "../utils/index.js";

export class PromptBuilder {
  createAnalysisPrompt(
    originalQuery: string,
    synonyms: string[],
    contents: ScrapedContent[],
    marketData: MarketData[]
  ): string {
    let prompt = `# Cryptocurrency Analysis\n**Query:** ${originalQuery}\n**Date:** ${getCurrentDateFormatted()}\n`;
    
    if (marketData && marketData.length > 0) {
      prompt += `\n## Market Data\n`;
      for (const coin of marketData) {
        prompt += `### ${coin.name} (${coin.symbol.toUpperCase()})\n`;
        prompt += `- Price: $${coin.current_price}\n`;
        prompt += `- Market Cap: $${coin.market_cap.toLocaleString()}\n`;
        prompt += `- 24h Change: ${coin.price_change_percentage_24h?.toFixed(2)}%\n\n`;
      }
    }
    
    prompt += `\n## Sources\n`;
    contents.forEach((content, index) => {
      prompt += `### ${index + 1}. ${content.title}\n`;
      prompt += `${content.cleanedContent.substring(0, 1000)}\n\n`;
    });
    
    prompt += `\nProvide analysis covering:\n1. Price trends and technical analysis\n2. Market sentiment\n3. Key insights and outlook`;
    
    return prompt;
  }
}
