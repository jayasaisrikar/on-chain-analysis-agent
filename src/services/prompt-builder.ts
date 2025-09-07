import { ScrapedContent, MarketData } from "../types/index";
import { getCurrentDateFormatted } from "../utils/index";

export class PromptBuilder {
  private readonly analysisSystemPrompt = `You are an expert cryptocurrency analyst with deep knowledge of market trends, technical analysis, and fundamental factors affecting digital asset prices. 

Your task is to provide comprehensive, actionable cryptocurrency analysis based on multiple sources and search queries.

## Analysis Guidelines:
1. **Synthesize Information**: Combine insights from all provided sources
2. **Technical Focus**: Include technical indicators, chart patterns, support/resistance levels when relevant
3. **Market Context**: Consider broader market conditions and trends
4. **Evidence-Based**: Reference specific sources and data points
5. **Actionable Insights**: Provide clear takeaways and potential implications
6. **Balanced Perspective**: Present both bullish and bearish viewpoints when applicable

## Response Format:
Provide a well-structured analysis that covers:
- **Executive Summary**: Key findings and current status
- **Technical Analysis**: Chart patterns, indicators, key levels (if applicable)
- **Market Drivers**: Fundamental factors and catalysts
- **Outlook**: Short-term and medium-term projections
- **Key Takeaways**: Actionable insights for traders/investors

Use clear markdown formatting and reference sources when making specific claims.`;

  buildPrompt(
    originalQuery: string,
    synonyms: string[],
    contents: ScrapedContent[],
    marketData: MarketData[]
  ): string {
    const prompt = this.createAnalysisPrompt(originalQuery, synonyms, contents, marketData);
    return `${this.analysisSystemPrompt}\n\n${prompt}`;
  }

  createAnalysisPrompt(
    originalQuery: string,
    synonyms: string[],
    contents: ScrapedContent[],
    marketData: MarketData[]
  ): string {
    const currentDate = getCurrentDateFormatted();
    
    let prompt = `# Cryptocurrency Analysis Request\n\n`;
    prompt += `**Original Query:** ${originalQuery}\n`;
    prompt += `**Analysis Date:** ${currentDate}\n`;
    prompt += `**Search Synonyms Used:** ${synonyms.join(', ')}\n\n`;
    
    // Market Data Section
    if (marketData && marketData.length > 0) {
      prompt += `## Current Market Data\n\n`;
      for (const coin of marketData) {
        prompt += `### ${coin.name} (${coin.symbol.toUpperCase()})\n`;
        prompt += `- **Current Price:** $${coin.current_price?.toLocaleString() || 'N/A'}\n`;
        prompt += `- **Market Cap:** $${coin.market_cap?.toLocaleString() || 'N/A'}\n`;
        prompt += `- **Market Cap Rank:** #${coin.market_cap_rank || 'N/A'}\n`;
        prompt += `- **24h Volume:** $${coin.total_volume?.toLocaleString() || 'N/A'}\n`;
        prompt += `- **24h Price Change:** ${coin.price_change_percentage_24h?.toFixed(2) || 'N/A'}%\n`;
        prompt += `- **7d Price Change:** ${coin.price_change_percentage_7d?.toFixed(2) || 'N/A'}%\n`;
        prompt += `- **30d Price Change:** ${coin.price_change_percentage_30d?.toFixed(2) || 'N/A'}%\n`;
        prompt += `- **24h High:** $${coin.high_24h?.toLocaleString() || 'N/A'}\n`;
        prompt += `- **24h Low:** $${coin.low_24h?.toLocaleString() || 'N/A'}\n`;
        prompt += `- **All-Time High:** $${coin.ath?.toLocaleString() || 'N/A'} (${coin.ath_change_percentage?.toFixed(2) || 'N/A'}% from ATH)\n`;
        prompt += `- **All-Time Low:** $${coin.atl?.toLocaleString() || 'N/A'} (${coin.atl_change_percentage?.toFixed(2) || 'N/A'}% from ATL)\n`;
        prompt += `- **Circulating Supply:** ${coin.circulating_supply?.toLocaleString() || 'N/A'}\n`;
        prompt += `- **Total Supply:** ${coin.total_supply?.toLocaleString() || 'N/A'}\n`;
        prompt += `- **Max Supply:** ${coin.max_supply?.toLocaleString() || 'Limited'}\n\n`;
      }
    }
    
    // Research Sources Section
    if (contents && contents.length > 0) {
      prompt += `## Research Sources\n\n`;
      contents.forEach((content, index) => {
        prompt += `### Source ${index + 1}: ${content.title}\n`;
        prompt += `**URL:** ${content.url}\n`;
        if (content.publishedDate) {
          prompt += `**Published:** ${content.publishedDate}\n`;
        }
        prompt += `**Content:** ${content.cleanedContent.substring(0, 1500)}...\n\n`;
      });
    }
    
    prompt += `## Analysis Requirements\n\n`;
    prompt += `Based on the market data and research sources provided above, please provide a comprehensive cryptocurrency analysis that includes:\n\n`;
    prompt += `1. **Executive Summary**: Key findings and current market status\n`;
    prompt += `2. **Technical Analysis**: Price trends, chart patterns, key support/resistance levels, technical indicators (RSI, MACD, etc.)\n`;
    prompt += `3. **Market Drivers**: Fundamental factors, news catalysts, and market sentiment\n`;
    prompt += `4. **Risk Assessment**: Both bullish and bearish scenarios\n`;
    prompt += `5. **Outlook**: Short-term (1-4 weeks) and medium-term (1-3 months) projections\n`;
    prompt += `6. **Key Takeaways**: Actionable insights for traders and investors\n\n`;
    prompt += `Please reference specific sources and data points in your analysis, and ensure all price levels and percentages are clearly stated.`;
    
    return prompt;
  }
}
