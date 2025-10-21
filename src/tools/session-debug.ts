import { createTool } from "@iqai/adk";
import { z } from "zod";
import { getAllCachedData } from "../utils/market-data-cache";

/**
 * Helper that flattens all cached market data entries into a single array suitable
 * for direct consumption by the analysis agent. This mirrors the shape used by the
 * market_data_agent's outputKey (market_data_results) so that the analysis agent can
 * treat it as if the session state already contained real-time prices. This is a
 * workaround because the session state's market_data_results field is only populated
 * after the full pipeline completes; the analysis agent runs before that mutation.
 */
function getFlattenedMarketDataResults() {
  try {
    const all = getAllCachedData();
    const combined: any[] = [];
    for (const entry of all) {
      if (entry?.data?.data && Array.isArray(entry.data.data)) {
        for (const item of entry.data.data) {
          combined.push(item);
        }
      }
    }
    return combined.length ? combined : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Debug tool for the analysis agent to inspect available session data
 */
export const sessionDebugTool = createTool({
  name: "debug_session_data",
  description: "Debug tool to inspect available session state and ensure market data is surfaced early for analysis",
  schema: z.object({
    inspect: z.enum(["session", "cache", "both"]).describe("What to inspect"),
  }),
  fn: async ({ inspect }) => {
    const result: any = {
      timestamp: new Date().toISOString(),
      inspect_type: inspect,
    };

    // Always surface flattened market data under market_data_results if available (LLM expects this key)
    const flattened = getFlattenedMarketDataResults();
    if (flattened) {
      result.market_data_results = flattened;
      // Provide lightweight summary for quick glance
      result.market_data_summary = flattened.map(m => ({ token: m.token, price: m.price, change_24h: m.change_24h })).slice(0, 10);
    }

    // Optionally include full cache dump if requested
    if (inspect === "cache" || inspect === "both") {
      result.cached_market_data = getAllCachedData();
    }

    // If session requested, we still return market_data_results (so analysis agent sees it on 'session')
    return result;
  },
});