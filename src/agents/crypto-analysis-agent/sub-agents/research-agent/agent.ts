import { AgentBuilder, createTool } from "@iqai/adk";
import { google } from "@ai-sdk/google";
import { z } from "zod";
import { env } from "../../../../env";
import { ResearchService } from "./tools";

/**
 * Research Agent
 * 
 * Specialized agent for cryptocurrency research using web search and content analysis
 */
export async function researchAgent() {
  const researchService = new ResearchService();

  const researchTool = createTool({
    name: "research_service",
    description: "Search for cryptocurrency information and scrape web content for analysis",
    schema: z.object({
      action: z.enum(["search", "scrape", "searchAndScrape"]).describe("The research action to perform"),
      query: z.string().optional().describe("Search query for cryptocurrency research"),
      urls: z.array(z.string()).optional().describe("Array of URLs to scrape (for scrape action)"),
      maxResults: z.number().optional().describe("Maximum number of search results (default: 5)"),
      searchEngine: z.enum(["exa", "tavily", "auto"]).optional().describe("Search engine to use (default: auto)")
    }),
    fn: async (args) => {
      return await researchService.execute(args);
    }
  });

  return await AgentBuilder
    .create("research_agent")
    .withModel(google(env.LLM_MODEL || "gemini-2.5-flash"))
    .withDescription("Specialized agent for cryptocurrency research and web content analysis")
    .withInstruction(`
You are a cryptocurrency research specialist. Your job is to:

1. **Web Research**: Search for cryptocurrency-related information using multiple sources
2. **Content Analysis**: Scrape and analyze web content for insights
3. **News Aggregation**: Find recent news and developments
4. **Trend Analysis**: Identify market trends and sentiment from research

## Available Functions:
- **searchCrypto**: Search for crypto information using Exa/Tavily
- **scrapeContent**: Extract content from specific URLs
- **analyzeSentiment**: Analyze sentiment from research content

## Research Focus Areas:
- **Recent News**: Latest developments, partnerships, updates
- **Market Sentiment**: Community discussions, expert opinions
- **Technical Developments**: Protocol updates, technological advances
- **Regulatory News**: Government actions, compliance updates
- **Price Analysis**: Expert predictions and technical analysis

## Guidelines:
- Prioritize recent content (last 7 days for news, last 30 days for analysis)
- Focus on credible sources (major crypto news sites, official announcements)
- Extract key insights and actionable information
- Identify both bullish and bearish signals
- Note publication dates and source credibility

## Data Sources:
- Exa (neural search for deep insights)
- Tavily (comprehensive web search)
- Direct URL scraping for specific content

Focus on providing comprehensive, recent, and credible research to support analysis decisions.
    `)
    .withTools(researchTool)
    .build();
}
