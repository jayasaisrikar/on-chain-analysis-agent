import { AgentBuilder, createTool } from "@iqai/adk";
import { google } from "@ai-sdk/google";
import { z } from "zod";
import { env } from "./env";
import { runDAGPipeline } from "./pipeline/dag-orchestrator";

export async function agent() {
  const cryptoAnalysisTool = createTool({
    name: "analyze_cryptocurrency",
    description: "Analyze cryptocurrency markets, trends, and provide comprehensive investment insights using real-time data",
    schema: z.object({
      query: z.string().describe("The cryptocurrency analysis query from the user")
    }),
    fn: async (args: { query: string }) => {
      const ctx = await runDAGPipeline(args.query);
      if (ctx.errors.length) {
        return ctx.finalReport + "\n\nWarnings: " + ctx.errors.join('; ');
      }
      return ctx.finalReport;
    }
  });

  return await AgentBuilder
    .create("crypto_analysis_agent")
    .withModel(google(env.LLM_MODEL || "gemini-2.0-flash-exp"))
    .withDescription("Professional cryptocurrency analysis agent")
    .withInstruction(`
You are a professional cryptocurrency analyst with access to real-time market data and research capabilities.

When a user asks about cryptocurrency topics, you should:

1. Use the analyze_cryptocurrency tool to get comprehensive analysis
2. Provide detailed, data-driven insights
3. Include current market data and recent news
4. Offer balanced analysis with both opportunities and risks
5. Always include investment risk disclaimers

Your responses should be:

For ANY cryptocurrency query, analyze it thoroughly using all available data sources.

Always include disclaimers about investment risks and market volatility.
    `)
    .withTools(cryptoAnalysisTool)
    .build();
}
