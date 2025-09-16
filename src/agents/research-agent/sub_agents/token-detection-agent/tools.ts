import { createTool } from "@iqai/adk";
import { z } from "zod";

// Token Detection Tool
export const tokenDetectionTool = createTool({
  name: "token_detection",
  description: "Identify cryptocurrency tokens mentioned in user queries",
  schema: z.object({
    query: z.string().describe("User query to analyze for crypto tokens")
  }),
  fn: async ({ query }) => {
    try {
      // Simple token detection logic - can be enhanced with more sophisticated matching
      const cryptoKeywords = [
        'bitcoin', 'btc', 
        'ethereum', 'eth', 
        'solana', 'sol', 
        'cardano', 'ada', 
        'dogecoin', 'doge',
        'chainlink', 'link',
        'polygon', 'matic',
        'avalanche', 'avax',
        'polkadot', 'dot',
        'uniswap', 'uni'
      ];
      
      const lowerQuery = query.toLowerCase();
      const detectedTokens = cryptoKeywords.filter(token => lowerQuery.includes(token));
      
      return {
        tokens: detectedTokens.length > 0 ? detectedTokens : ['bitcoin'], // Default to bitcoin if no tokens found
        query: query,
        detection_method: "keyword_matching",
        confidence: detectedTokens.length > 0 ? "high" : "default"
      };
    } catch (error) {
      return { 
        tokens: ['bitcoin'], 
        query: query, 
        error: 'Token detection failed',
        detection_method: "fallback"
      };
    }
  }
});