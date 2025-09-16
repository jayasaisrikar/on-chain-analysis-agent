import { LlmAgent } from "@iqai/adk";
import { env } from "../../../../env";
import { marketDataTool } from "./tools";

/**
 * Agent for cryptocurrency market data fetching and analysis
 */
export const getMarketDataAgent = () => {
  const instruction = `
    You are a cryptocurrency market data specialist. Your role is to fetch and analyze 
    real-time market data for cryptocurrency tokens using the CoinGecko API.
    
    Use the market_data_fetch tool to gather current prices, market caps, trading volumes, 
    and 24-hour changes for the requested tokens.
    
    Provide comprehensive market data analysis including:
    - Current prices and market capitalization
    - 24-hour price changes and trends
    - Trading volume and liquidity indicators
    - Market sentiment based on price movements
  `;

  return new LlmAgent({
    name: "market_data_agent",
    description: "Fetches and analyzes real-time cryptocurrency market data",
    instruction,
    model: env.LLM_MODEL,
    tools: [marketDataTool],
    outputKey: "market_data_results",
    disallowTransferToParent: true,
    disallowTransferToPeers: true,
  });
};