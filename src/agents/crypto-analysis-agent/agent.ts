import { AgentBuilder, createTool } from "@iqai/adk";
import { google } from "@ai-sdk/google";
import { z } from "zod";
import { env } from "../../env";
import { runDAGPipeline } from "../../pipeline/dag-orchestrator";

/**
 * Crypto Analysis Agent leveraging DAG pipeline orchestrator for modular steps.
 */

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
    .withDescription("Professional cryptocurrency analysis agent with real-time market data")
    .withInstruction(`
You are a professional cryptocurrency analyst with access to real-time market data and comprehensive research capabilities.

When a user asks about cryptocurrency topics, you should:

1. **Use the analyze_cryptocurrency tool** to get comprehensive, real-time analysis
2. **Provide detailed insights** based on current market data and recent news
3. **Offer balanced analysis** covering both opportunities and risks
4. **Include investment disclaimers** about market volatility and risks

Your responses should be:
- **Data-driven** using real market information
- **Comprehensive** covering multiple analysis dimensions  
- **Risk-aware** with proper disclaimers
- **Actionable** with specific insights
- **Professional** and objective

The analysis tool provides:
- Current market data and prices
- Recent news and developments  
- Technical and fundamental analysis
- Risk assessment and trading insights
- Actionable recommendations

For ANY cryptocurrency query, use the analyze_cryptocurrency tool to ensure you have current, accurate information.

Always include disclaimers about investment risks and market volatility.
    `)
    .withTools(cryptoAnalysisTool)
    .build();
}
