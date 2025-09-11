import { LlmAgent } from "@iqai/adk";
import { env } from '../../env';

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

If NO tokens are found, return exactly: "No tokens found"`;

/**
 * Returns an LlmAgent configured to identify tokens from a short user query.
 */
export const getTokenIdentifierAgent = () => {
  const agent = new LlmAgent({
    name: 'token_identifier',
    description: 'Identifies cryptocurrency tokens from user queries using built-in crypto knowledge',
    model: env.LLM_MODEL,
    instruction,
  });

  return agent;
};

export default getTokenIdentifierAgent;
