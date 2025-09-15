import { AgentBuilder, createTool } from "@iqai/adk";
import { env } from "../../env";
import { tokenDetector } from "./tools";
import { agent as marketDataAgentFactory } from "../market-data-agent/agent";

export async function agent(modelOverride?: string) {
  const model = modelOverride || env.QUERY_LLM_MODEL;
  const marketDataAgentTool = createTool({
    name: "market_data_agent_tool",
    description: "Delegates market data fetches to the market-data agent (agent-as-tool wrapper)",
    schema: undefined as any,
    fn: async (args: any) => {
      const marketAgent = await marketDataAgentFactory(modelOverride);
      try {
        const tool = (marketAgent as any).tools?.find((t: any) => t.name === 'coingecko_market_data') || (marketAgent as any).tools?.[0];
        if (tool && typeof tool.fn === 'function') {
          return await tool.fn(args);
        }
      } catch (err) {
        console.warn('[market_data_agent_tool] delegated call failed', err);
      }

      try {
        const mod = await import('../market-data-agent/tools');
        if (mod && typeof mod.fetchCoinGeckoMarketData === 'function') {
          const tokens = args.tokens || args;
          return await mod.fetchCoinGeckoMarketData(tokens);
        }
      } catch (err) {
        console.warn('[market_data_agent_tool] dynamic import fallback failed', err);
      }

      return { success: false, error: 'market_data_agent_tool: unable to fetch market data' };
    }
  });

  return await AgentBuilder.create("token_market_agent")
    .withModel(model)
    .withDescription("Detects cryptocurrency tokens in the query and fetches real-time market data")
    .withInstruction(`You extract cryptocurrency token identifiers from the user query and fetch real-time market data.

INSTRUCTIONS:
1. Use token_detector first.
2. Use coingecko_market_data (via the market_data_agent_tool wrapper) with detected tokens (if any).
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
