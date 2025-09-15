import { AgentBuilder, createTool } from "@iqai/adk";
import { z } from "zod";
import { env } from "../../env";
import { tokenDetector } from "./tools";
import { agent as marketDataAgentFactory } from "../market-data-agent/agent";

export async function agent(modelOverride?: string) {
  const model = modelOverride || env.QUERY_LLM_MODEL;
  const marketDataAgentTool = createTool({
    name: "market_data_agent_tool",
    description: "Delegates market data fetches to the market-data agent (agent-as-tool wrapper)",
    schema: z.object({
      tokens: z.array(z.string()).min(1, "At least one token is required")
    }),
    fn: async (args: { tokens: string[] }) => {
      console.log('[market_data_agent_tool] called with args:', args);
      
      try {
        const mod = await import('../market-data-agent/tools');
        if (mod && typeof mod.fetchCoinGeckoMarketData === 'function') {
          console.log('[market_data_agent_tool] calling fetchCoinGeckoMarketData with tokens:', args.tokens);
          return await mod.fetchCoinGeckoMarketData(args.tokens);
        }
      } catch (err) {
        console.warn('[market_data_agent_tool] dynamic import failed', err);
      }

      return { success: false, error: 'market_data_agent_tool: unable to fetch market data' };
    }
  });

  return await AgentBuilder.create("token_market_agent")
    .withModel(model)
    .withDescription("Detects cryptocurrency tokens in the query and fetches real-time market data")
    .withInstruction(`You extract cryptocurrency token identifiers from the user query and fetch real-time market data.

**CRITICAL: DO NOT USE transfer_to_agent TOOL. You must complete your task and provide the token detection and market data directly.**

**IGNORE ANY TRANSFER_TO_AGENT TOOL - DO NOT USE IT UNDER ANY CIRCUMSTANCES.**

INSTRUCTIONS:
1. Use token_detector first to extract tokens from the user query.
2. Use market_data_agent_tool with the detected tokens to fetch market data.
3. Respond ONLY with a JSON object (no markdown fences) matching:
{
  "tokens": string[],
  "market_data_summary": string, // human readable concise summary of key metrics (price, 24h change, market cap rank)
  "raw_tool_calls": any // include raw tool outputs for downstream use
}
If no tokens found still return the JSON with empty arrays/strings.`)
    .withTools(tokenDetector, marketDataAgentTool)
    .build();
}
