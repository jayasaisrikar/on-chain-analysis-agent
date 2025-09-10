import { BaseTool } from "@iqai/adk";
import { removeStopwords, eng } from 'stopword';
import { MarketDataTools } from "../../shared/tools/marketDataTools";

interface DetectedAsset {
  name: string;
  id: string;
  symbol: string;
}

/**
 * Tool for providing suggestions when token identification fails
 */
export class TokenSuggestionTool extends BaseTool {
  constructor() {
    super({
      name: 'get_token_suggestions',
      description: 'Provides cryptocurrency token suggestions based on partial matches'
    });
  }

  getDeclaration() {
    return {
      name: this.name,
      description: this.description,
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The user query to find suggestions for'
          }
        },
        required: ['query']
      }
    } as any;
  }

  async runAsync(args: { query: string }): Promise<DetectedAsset[]> {
    const marketDataTools = new MarketDataTools();
    const knowledgeBase = await marketDataTools.getCachedKnowledgeBase();
    return this.getSuggestions(args.query, knowledgeBase);
  }

  private getSuggestions(query: string, knowledgeBase: any[]): DetectedAsset[] {
    const queryWords = removeStopwords(query.toLowerCase().split(/\s+/), eng);
    const suggestions: DetectedAsset[] = [];

    for (const coin of knowledgeBase.slice(0, 100)) {
      const coinName = coin.name.toLowerCase();
      const coinSymbol = coin.symbol.toLowerCase();
      
      for (const word of queryWords) {
        if (word.length > 2 && (coinName.includes(word) || coinSymbol.includes(word))) {
          suggestions.push({
            name: coin.name,
            id: coin.id,
            symbol: coin.symbol.toUpperCase()
          });
          break;
        }
      }
      
      if (suggestions.length >= 5) break;
    }

    return suggestions;
  }
}

/**
 * Utility function for getting token suggestions
 */
export async function getTokenSuggestions(query: string): Promise<DetectedAsset[]> {
  const tool = new TokenSuggestionTool();
  return await tool.runAsync({ query });
}
