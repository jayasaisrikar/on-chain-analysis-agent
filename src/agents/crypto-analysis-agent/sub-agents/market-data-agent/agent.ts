import { AgentBuilder, createTool } from "@iqai/adk";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { MarketDataService } from "./tools";

/**
 * Market Data Agent
 * 
 * Specialized agent for fetching and analyzing cryptocurrency market data
 */
export async function marketDataAgent() {
  const marketDataService = new MarketDataService();

  const marketDataTool = createTool({
    name: "market_data_service",
    description: "Get real-time cryptocurrency market data including prices, market cap, volume, and other metrics",
    schema: z.object({
      action: z.enum(["getMarketData", "getTopCoins", "convertSymbols"]).describe("The action to perform"),
      coinIds: z.array(z.string()).optional().describe("Array of CoinGecko coin IDs (e.g., ['bitcoin', 'ethereum'])"),
      symbols: z.array(z.string()).optional().describe("Array of coin symbols (e.g., ['BTC', 'ETH']) - will be converted to IDs"),
      topCount: z.number().optional().describe("Number of top coins to fetch by market cap (for getTopCoins action)")
    }),
    fn: async (args) => {
      return await marketDataService.execute(args);
    }
  });

  return await AgentBuilder
    .create("market_data_agent")
    .withModel(openai("gpt-4o-mini"))
    .withDescription("Specialized agent for cryptocurrency market data analysis")
    .withInstruction(`
You are a cryptocurrency market data specialist. Your job is to:

1. **Fetch Market Data**: Get real-time cryptocurrency prices, market caps, volumes, and other metrics
2. **Process Requests**: Handle requests for specific coins by symbol or ID
3. **Provide Context**: Add market context and interpret the data
4. **Format Results**: Present data in a clear, actionable format

## Available Functions:
- **getMarketData**: Fetch market data for specific cryptocurrencies
- **getTopCoins**: Get market data for top cryptocurrencies by market cap
- **convertSymbols**: Convert crypto symbols to CoinGecko IDs

## Guidelines:
- Always provide current prices with 24h changes
- Include market cap and volume when relevant
- Highlight significant price movements (>5% change)
- Compare against Bitcoin when analyzing altcoins
- Note market cap rankings for context
- Include all-time high data when available

## Data Sources:
- Primary: CoinGecko API (free tier or pro if available)
- Real-time data with sub-minute updates
- Comprehensive market metrics

Focus on providing accurate, timely market data to support analysis decisions.
    `)
    .withTools(marketDataTool)
    .build();
}
