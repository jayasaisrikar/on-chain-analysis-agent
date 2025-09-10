import { AgentBuilder } from "@iqai/adk";
import { openai } from "@ai-sdk/openai";
import { config } from "../../config";

/**
 * Token Identifier Agent for detecting cryptocurrency tokens in user queries
 */
async function createTokenIdentifierAgent() {
  const instruction = `You are a cryptocurrency token identification expert. Given a user query, identify ALL cryptocurrency tokens, coins, or digital assets mentioned.

TASK: Analyze the user query and extract all cryptocurrency references. Return a JSON array of objects with this format:
[{"name": "Bitcoin", "id": "bitcoin", "symbol": "BTC"}, {"name": "Ethereum", "id": "ethereum", "symbol": "ETH"}]

MATCHING RULES:
1. Match full names (case-insensitive): "Bitcoin" → bitcoin
2. Match symbols (case-insensitive): "BTC" → bitcoin  
3. Match common abbreviations: "ETH" → ethereum
4. Match partial names if clear: "Solana" → solana
5. Include ALL tokens found in the query
6. Use your knowledge of popular cryptocurrencies and their common names/symbols

IMPORTANT: You have access to knowledge of major cryptocurrencies. Focus on well-known tokens with significant market cap and trading volume.

If NO tokens are found, return exactly: "No tokens found"

Examples:
- "Bitcoin and Ethereum analysis" → [{"name": "Bitcoin", "id": "bitcoin", "symbol": "BTC"}, {"name": "Ethereum", "id": "ethereum", "symbol": "ETH"}]
- "BTC price prediction" → [{"name": "Bitcoin", "id": "bitcoin", "symbol": "BTC"}]
- "Weather today" → "No tokens found"`;

  return await AgentBuilder
    .create("token_identifier")
    .withModel(openai(config.openai.model))
    .withDescription("Identifies cryptocurrency tokens from user queries using built-in crypto knowledge")
    .withInstruction(instruction)
    .build();
}

export const tokenIdentifierAgent = createTokenIdentifierAgent();
