import { createTool } from "@iqai/adk";
import { z } from "zod";
import { getAllCachedData } from "../utils/market-data-cache";

/**
 * Debug tool for the analysis agent to inspect available session data
 */
export const sessionDebugTool = createTool({
  name: "debug_session_data",
  description: "Debug tool to inspect available session state and cached market data",
  schema: z.object({
    inspect: z.enum(["session", "cache", "both"]).describe("What to inspect"),
  }),
  fn: async ({ inspect }) => {
    const result: any = {
      timestamp: new Date().toISOString(),
      inspect_type: inspect
    };
    
    if (inspect === "cache" || inspect === "both") {
      result.cached_market_data = getAllCachedData();
    }
    return result;
  },
});